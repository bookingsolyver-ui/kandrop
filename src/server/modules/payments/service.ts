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
  type PaymentRequest,
  type PaymentRequestInput,
} from "@/shared/checkout/schemas";
import { PROVIDER_TIMEOUT_MS, requestPayment, type MulticaixaEvent } from "./multicaixa";
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

function markPaid(p: PaymentRecord) {
  p.status = "success";
  p.paidAt = Date.now();
  const session = checkoutRepository.get(p.sessionId);
  if (session) {
    session.paid = true;
    // Every confirmed payment gets its receipt, whichever method or channel confirmed it.
    issueReceipt(p, session);
    // A store paying for its Kandrop plan: switch the plan on (no-op for ordinary sales).
    activateSubscription(session, p.paidAt);
  }
}

/** Lazily applies what is due: a polled provider's answer, or the timeout of a webhook one. */
function settle(p: PaymentRecord): PaymentRecord {
  if (p.status === "pending" && p.providerRef && Date.now() > p.createdAt + PROVIDER_TIMEOUT_MS) {
    // The provider never called back. Fail visibly rather than leave the payer waiting forever.
    p.status = "failed";
    p.failureCode = "timeout";
  } else if (p.status === "pending" && p.settle && Date.now() >= p.settle.at) {
    if (p.settle.status === "success") markPaid(p);
    else {
      p.status = "failed";
      p.failureCode = p.settle.failureCode;
    }
    p.settle = undefined;
  }
  return p;
}

export async function createPayment(input: PaymentRequestInput, clientKey: string) {
  assertSandbox();
  const req = paymentRequestSchema.parse(input); // never log `input`: it may contain card data

  const session = checkoutRepository.get(req.sessionId);
  if (!session) throw new ApiError("not_found");
  const state = statusOf(session);
  if (state === "paid") throw new ApiError("checkout_paid");
  if (state === "expired") throw new ApiError("checkout_expired");

  // Idempotency: a double-click or retry while one is pending returns that same payment.
  const latest = paymentRepository.bySession(session.id)[0];
  if (latest && settle(latest).status === "pending") return toPublic(latest);
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
      if (sim.verdict.status === "success") markPaid(payment);
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

  paymentRepository.save(payment);
  if (payment.status === "success") attempts.reset(key);
  return toPublic(payment);
}

export type ProviderOutcome = "applied" | "ignored" | "unknown";

/**
 * Applies a provider event that has already passed signature verification. Idempotent: a
 * replayed, duplicate or late event never changes a payment that is no longer pending.
 */
export function applyProviderEvent(event: MulticaixaEvent): ProviderOutcome {
  const payment = paymentRepository.byProviderRef(event.transactionId);
  if (!payment) return "unknown";

  if (settle(payment).status !== "pending") {
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

  if (event.event === "payment.succeeded") markPaid(payment);
  else {
    payment.status = "failed";
    payment.failureCode = event.reason ?? "declined_by_customer";
  }
  return "applied";
}

export function getPayment(id: string): PublicPayment | null {
  const payment = paymentRepository.get(id);
  return payment ? toPublic(settle(payment)) : null;
}

/** The payer abandons a pending confirmation (e.g. to choose another method). */
export function cancelPayment(id: string): PublicPayment | null {
  const payment = paymentRepository.get(id);
  if (!payment) return null;
  if (settle(payment).status === "pending") {
    payment.status = "cancelled";
    payment.failureCode = "cancelled";
    payment.settle = undefined;
  }
  return toPublic(payment);
}
