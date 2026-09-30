import { randomBytes } from "node:crypto";
import { getEnv } from "@/server/config/env";
import { ApiError } from "@/server/http/errors";
import { attemptLimiter } from "@/server/http/rateLimit";
import { activateSubscription } from "@/server/modules/billing/activation";
import { issueReceipt } from "@/server/modules/receipts/service";
import { checkoutRepository } from "@/server/modules/checkout/repository";
import { statusOf } from "@/server/modules/checkout/service";
import {
  cardBrand,
  paymentRequestSchema,
  transferRequestSchema,
  type PaymentRequest,
  type PaymentRequestInput,
} from "@/shared/checkout/schemas";
import { PROVIDER_TIMEOUT_MS, requestPayment, type MulticaixaEvent } from "./multicaixa";
import { transferInfo } from "./transfer";
import { paymentRepository } from "./repository";
import type { PaymentRecord, PublicPayment } from "./schema";
import { simulate } from "./simulator";

// Card-testing and brute-force guard: at most 8 payment attempts per (IP, session) per 15 min.
const attempts = attemptLimiter({ max: 8, windowMs: 15 * 60 * 1000 });

function assertSandbox() {
  if (getEnv().PAYMENTS_MODE !== "sandbox") {
    // `live` means "talk to a real provider" — refuse rather than pretend to charge someone.
    console.error("[payments] PAYMENTS_MODE=live but no payment provider is integrated");
    throw new ApiError("payments_unavailable");
  }
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
  }
}

/** Lazily applies what is due: a polled provider's answer, or the timeout of a webhook one. */
async function settle(p: PaymentRecord): Promise<PaymentRecord> {
  if (p.status === "pending" && p.providerRef && Date.now() > p.createdAt + PROVIDER_TIMEOUT_MS) {
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
  assertSandbox();
  const req = paymentRequestSchema.parse(input); // never log `input`: it may contain card data

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
  };

  if (req.method === "multicaixa_express") {
    // Asynchronous: the provider answers later, through the signed webhook (`applyProviderEvent`).
    payment.providerRef = requestPayment({ phone: req.phone, amount: session.total }).transactionId;
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

export type ProviderOutcome = "applied" | "ignored" | "unknown";

/**
 * Applies a provider event that has already passed signature verification. Idempotent: a
 * replayed, duplicate or late event never changes a payment that is no longer pending.
 */
export async function applyProviderEvent(event: MulticaixaEvent): Promise<ProviderOutcome> {
  const payment = await paymentRepository.byProviderRef(event.transactionId);
  if (!payment) return "unknown";

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
