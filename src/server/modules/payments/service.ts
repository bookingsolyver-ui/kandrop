import "server-only";
import { randomBytes } from "node:crypto";
import { getEnv } from "@/server/config/env";
import { ApiError } from "@/server/http/errors";
import { attemptLimiter } from "@/server/http/rateLimit";
import { activateSubscription } from "@/server/modules/billing/activation";
import { issueReceipt } from "@/server/modules/receipts/service";
import { fulfilPaidCheckout } from "@/server/modules/fulfilment/service";
import { checkoutRepository } from "@/server/modules/checkout/repository";
import type { CheckoutSession } from "@/server/modules/checkout/schema";
import { statusOf } from "@/server/modules/checkout/service";
import {
  cardBrand,
  paymentRequestSchema,
  transferRequestSchema,
  type PaymentRequest,
  type PaymentRequestInput,
} from "@/shared/checkout/schemas";
import { requestPayment, type MulticaixaEvent } from "./multicaixa";
import {
  OLUALI_TIMEOUT_MS,
  OlualiError,
  chargeInstructions,
  createCharge,
  type OlualiPaymentType,
} from "./oluali";
import { transferInfo } from "./transfer";
import { paymentRepository } from "./repository";
import type { PaymentRecord, PublicPayment } from "./schema";
import { simulate } from "./simulator";

// Card-testing and brute-force guard: at most 8 payment attempts per (IP, session) per 15 min.
const attempts = attemptLimiter({ max: 8, windowMs: 15 * 60 * 1000 });

/**
 * `sandbox` simulates every method. `live` talks to a real provider, and the only one integrated is
 * Oluali, for Multicaixa Express and pay-by-reference: every other method is refused rather than pretend to charge someone.
 */
function assertAvailable(method: PaymentRequest["method"]): { live: boolean } {
  const env = getEnv();
  if (env.PAYMENTS_MODE === "sandbox") return { live: false };
  if (
    (method !== "multicaixa_express" && method !== "reference") ||
    !env.OLUALI_API_KEY || !env.OLUALI_BASE_URL) {
    console.error("[payments] PAYMENTS_MODE=live but this method has no integrated provider", { method });
    throw new ApiError("payments_unavailable");
  }
  return { live: true };
}

function maskedTarget(req: PaymentRequest): string {
  if (req.method === "card") {
    const brand = cardBrand(req.card.number);
    return `${brand === "unknown" ? "" : `${brand} `}•••• ${req.card.number.slice(-4)}`.trim();
  }
  return `+244 9•• ••• ${req.phone.slice(-3)}`;
}

function reference(): string {
  // Crockford-style alphabet: no 0/O/1/I, so it can be read out over the phone.
  const alphabet = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
  const bytes = randomBytes(10);
  return `KD-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}

export function toPublic(p: PaymentRecord): PublicPayment {
  return {
    id: p.id,
    reference: p.reference,
    sessionId: p.sessionId,
    method: p.method,
    status: p.status,
    amount: { amount: p.amount, currency: p.currency },
    failureCode: p.failureCode,
    target: p.target,
    createdAt: new Date(p.createdAt).toISOString(),
    paidAt: p.paidAt ? new Date(p.paidAt).toISOString() : undefined,
    instructions: p.status === "pending" ? p.instructions : undefined,
  };
}

async function markPaid(p: PaymentRecord) {
  p.status = "success";
  p.paidAt = Date.now();
  await paymentRepository.save(p); // the payment is paid before anything that follows from it
  const session = await checkoutRepository.get(p.sessionId);
  if (session) {
    if (!session.paid) await checkoutRepository.save({ ...session, paid: true });
    // Every confirmed payment gets its receipt, whichever method or channel confirmed it.
    await issueReceipt(p, session);
    // A store paying for its Kandrop plan: switch the plan on (no-op for ordinary sales).
    await activateSubscription(session, p.paidAt);
    // A paid storefront sale becomes an order (and, for a supplier product, the supplier's line,
    // Kandrop's commission and the financial records). Never undoes the payment if it fails.
    await fulfilPaidCheckout(session, p);
  }
}

/** The Oluali payment type each of our methods is charged as. A "pay by reference" method maps to `REFERENCE` here. */
const OLUALI_TYPE: Partial<Record<PaymentRecord["method"], OlualiPaymentType>> = {
  multicaixa_express: "MCX",
  reference: "REFERENCE",
};

/** How long a webhook-confirmed payment may stay pending: 3 min for MCX, 2 h 15 min for a REFERENCE. */
const providerTimeoutMs = (p: PaymentRecord) => OLUALI_TIMEOUT_MS[OLUALI_TYPE[p.method] ?? "MCX"];

/** Lazily applies what is due: a polled provider's answer, or the timeout of a webhook one. */
async function settle(p: PaymentRecord): Promise<PaymentRecord> {
  if (p.status === "pending" && p.providerRef && Date.now() > p.createdAt + providerTimeoutMs(p)) {
    // The provider never called back. Fail visibly rather than leave the payer waiting forever.
    p.status = "failed";
    p.failureCode = "timeout";
    await paymentRepository.save(p);
  } else if (p.status === "pending" && p.settle && Date.now() >= p.settle.at) {
    const answer = p.settle;
    p.settle = undefined;
    if (answer.status === "success") await markPaid(p);
    else {
      p.status = "failed";
      p.failureCode = answer.failureCode;
      await paymentRepository.save(p);
    }
  }
  return p;
}

export async function createPayment(input: PaymentRequestInput, clientKey: string) {
  const req = paymentRequestSchema.parse(input); // never log `input`: it may contain card data
  const { live } = assertAvailable(req.method);

  const session = await checkoutRepository.get(req.sessionId);
  if (!session) throw new ApiError("not_found");
  const state = statusOf(session);
  if (state === "paid") throw new ApiError("checkout_paid");
  if (state === "expired") throw new ApiError("checkout_expired");

  // Idempotency: a double-click or retry while one is pending returns that same payment.
  const latest = (await paymentRepository.bySession(session.id))[0];
  if (latest && (await settle(latest)).status === "pending") return toPublic(latest);
  if (latest?.status === "success") throw new ApiError("checkout_paid");

  const key = `pay:${clientKey}:${session.id}`;
  attempts.assertAllowed(key);
  attempts.recordFailure(key); // every attempt counts; a success clears it below

  const payment: PaymentRecord = {
    id: `pay_${randomBytes(12).toString("base64url")}`,
    reference: reference(),
    sessionId: session.id,
    method: req.method,
    status: "pending",
    amount: session.total,
    currency: session.currency,
    target: maskedTarget(req),
    createdAt: Date.now(),
    // Who pays, as typed at the checkout (a card payment carries the cardholder instead).
    ...(req.method !== "card" && { payerName: req.name, payerEmail: req.email }),
  };

  if (req.method === "multicaixa_express" || req.method === "reference") {
    // Asynchronous: the provider answers later, through the signed webhook (`applyProviderEvent`).
    if (live) {
      const charge = await chargeWithOluali(session, req, OLUALI_TYPE[req.method]!);
      payment.providerRef = charge.providerRef;
      payment.instructions = charge.instructions;
    } else if (req.method === "multicaixa_express") {
      payment.providerRef = requestPayment({ phone: req.phone, amount: session.total }).transactionId;
    }
    // Sandbox reference: stays pending until "simulate success" (nothing real to pay).
  } else {
    const sim = simulate(req);
    if (sim.kind === "immediate") {
      if (sim.verdict.status === "success") await markPaid(payment);
      else {
        payment.status = "failed";
        payment.failureCode = sim.verdict.failureCode;
      }
    } else {
      payment.settle = {
        at: Date.now() + sim.afterMs,
        status: sim.verdict.status,
        failureCode: sim.verdict.status === "failed" ? sim.verdict.failureCode : undefined,
      };
    }
  }

  await paymentRepository.save(payment);
  if (payment.status === "success") attempts.reset(key);
  return toPublic(payment);
}

/**
 * Asks Oluali to charge the payer for the whole session (`MCX`: approved on their phone; `REFERENCE`: paid
 * later with the entity/reference we show them). Returns its `transaction_id`, kept as the payment's
 * `providerRef` (the webhook finds the payment by it), and, for a reference, the details to show.
 * `client_reference_id` is our checkout session id. Never logs the payer's data.
 */
async function chargeWithOluali(
  session: CheckoutSession,
  payer: { phone: string; name: string; email: string },
  type: OlualiPaymentType
): Promise<{ providerRef: string; instructions?: Record<string, string> }> {
  try {
    const charge = await createCharge({
      amount: session.total,
      payment_type: type,
      client_reference_id: session.id,
      customer: { name: payer.name, email: payer.email, phone: payer.phone },
    });
    if (typeof charge.transaction_id !== "string" || !charge.transaction_id) {
      console.error("[payments] Oluali answered without a transaction_id");
      throw new ApiError("payments_unavailable");
    }
    return {
      providerRef: charge.transaction_id,
      instructions: type === "REFERENCE" ? chargeInstructions(charge) : undefined,
    };
  } catch (err) {
    if (err instanceof OlualiError) throw new ApiError("payments_unavailable");
    throw err;
  }
}

/** What a provider tells us about a payment, whichever provider it is. */
export type ProviderEvent = Pick<
  MulticaixaEvent,
  "event" | "transactionId" | "amount" | "currency" | "reason"
>;

export type ProviderOutcome = "applied" | "ignored" | "unknown";

/**
 * Applies a provider event that has already passed signature verification. Idempotent: a
 * replayed, duplicate or late event never changes a payment that is no longer pending.
 */
export async function applyProviderEvent(
  event: ProviderEvent,
  opts: { clientReferenceId?: string } = {}
): Promise<ProviderOutcome> {
  const payment = await paymentRepository.byProviderRef(event.transactionId);
  if (!payment) return "unknown";
  // The provider echoes the reference we gave it (the checkout session): it must be this payment's.
  if (opts.clientReferenceId !== undefined && opts.clientReferenceId !== payment.sessionId) {
    console.error("[payments] provider reference mismatch", { paymentId: payment.id });
    return "ignored";
  }

  if ((await settle(payment)).status !== "pending") {
    // E.g. the payer cancelled or it timed out, then approved in the app anyway: money may have
    // moved without an order. Needs reconciliation with the provider (refund) once it is real.
    console.warn("[payments] provider event for a payment that is no longer pending", {
      paymentId: payment.id,
      status: payment.status,
      event: event.event,
    });
    return "ignored";
  }
  if (event.amount !== payment.amount || event.currency !== payment.currency) {
    console.error("[payments] provider amount mismatch", { paymentId: payment.id });
    return "ignored";
  }

  if (event.event === "payment.succeeded") await markPaid(payment);
  else {
    payment.status = "failed";
    payment.failureCode = event.reason ?? "declined_by_customer";
    await paymentRepository.save(payment);
  }
  return "applied";
}

export async function getPayment(id: string): Promise<PublicPayment | null> {
  const payment = await paymentRepository.get(id);
  return payment ? toPublic(await settle(payment)) : null;
}

/** The payer abandons a pending confirmation (e.g. to choose another method). */
export async function cancelPayment(id: string): Promise<PublicPayment | null> {
  const payment = await paymentRepository.get(id);
  if (!payment) return null;
  if ((await settle(payment)).status === "pending") {
    payment.status = "cancelled";
    payment.failureCode = "cancelled";
    payment.settle = undefined;
    await paymentRepository.save(payment);
  }
  return toPublic(payment);
}

/**
 * DEVELOPMENT SHORTCUT: forces a pending payment to `success`, exactly as if the provider had
 * confirmed it (receipt issued, plan activated), so the flow can be tested without approving
 * anything in Multicaixa Express. Refused (as "not found") unless the payments are simulated AND
 * this is not a production build. A payment that is no longer pending is returned untouched.
 */
export async function simulatePaymentSuccess(id: string): Promise<PublicPayment | null> {
  const env = getEnv();
  if (env.PAYMENTS_MODE !== "sandbox" || env.NODE_ENV === "production") {
    throw new ApiError("not_found");
  }
  const payment = await paymentRepository.get(id);
  if (!payment) return null;
  if ((await settle(payment)).status === "pending") {
    payment.settle = undefined;
    await markPaid(payment);
  }
  return toPublic(payment);
}

/** In sandbox mode a "bank" validates the transfer by itself after this long (a person would, for real). */
const SANDBOX_TRANSFER_CONFIRM_MS = 20_000;

/**
 * "Confirm transfer": registers the request and leaves it `pending`. **Nothing is paid and nothing is
 * activated**: pressing a button cannot buy a plan. The payment turns `success` only when the
 * transfer is validated — `confirmBankTransfer` (an administrator) or, in sandbox mode, a simulated
 * check after a short delay. Only for a store paying for its Kandrop plan: a shopper's purchase from a
 * merchant is paid to the merchant, not to Kandrop's account.
 */
export async function createBankTransfer(input: unknown, clientKey: string) {
  const { sessionId } = transferRequestSchema.parse(input);
  const session = await checkoutRepository.get(sessionId);
  if (!session || !session.subscription) throw new ApiError("not_found");
  const state = statusOf(session);
  if (state === "paid") throw new ApiError("checkout_paid");
  if (state === "expired") throw new ApiError("checkout_expired");
  const info = transferInfo();
  if (!info) throw new ApiError("payments_unavailable");

  // Idempotency: asking again while a payment is pending returns that same one.
  const latest = (await paymentRepository.bySession(session.id))[0];
  if (latest && (await settle(latest)).status === "pending") return toPublic(latest);
  if (latest?.status === "success") throw new ApiError("checkout_paid");

  const key = `transfer:${clientKey}:${session.id}`;
  attempts.assertAllowed(key);
  attempts.recordFailure(key);

  const sandbox = getEnv().PAYMENTS_MODE === "sandbox";
  const payment: PaymentRecord = {
    id: `pay_${randomBytes(12).toString("base64url")}`,
    reference: reference(),
    sessionId: session.id,
    method: "bank_transfer",
    status: "pending",
    amount: session.total,
    currency: session.currency,
    target: `IBAN •••• ${info.iban.slice(-4)}`,
    createdAt: Date.now(),
    settle: sandbox
      ? { at: Date.now() + SANDBOX_TRANSFER_CONFIRM_MS, status: "success" }
      : undefined,
  };
  return toPublic(await paymentRepository.save(payment));
}

/**
 * An administrator confirms the money arrived (see `POST /api/admin/transfers/:reference/confirm`):
 * the payment succeeds, the receipt is issued and the plan is switched on, exactly like any other
 * confirmed payment. Idempotent; `null` when there is no such transfer.
 */
export async function confirmBankTransfer(transferReference: string): Promise<PublicPayment | null> {
  const payment = await paymentRepository.byReference(transferReference);
  if (!payment || payment.method !== "bank_transfer") return null;
  if ((await settle(payment)).status === "pending") await markPaid(payment);
  return toPublic(payment);
}
