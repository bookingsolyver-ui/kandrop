import type { CheckoutSession } from "@/server/modules/checkout/schema";
import type { PaymentRecord } from "@/server/modules/payments/schema";
import { checkoutRepository } from "@/server/modules/checkout/repository";
import { paymentRepository } from "@/server/modules/payments/repository";
import { receiptRepository } from "./repository";
import type { PublicReceipt, Receipt } from "./schema";

const iso = (ms: number) => new Date(ms).toISOString();

/**
 * Issues the receipt for a confirmed payment. Called from the one place every success passes
 * through (`markPaid`), so a card, Multicaixa Express and Unitel Money all get one automatically.
 * Idempotent: a payment has exactly one receipt, and asking again returns that same document.
 */
export function issueReceipt(payment: PaymentRecord, session: CheckoutSession): Receipt {
  const existing = receiptRepository.byPayment(payment.id);
  if (existing) return existing;

  const issuedAt = Date.now();
  const year = new Date(issuedAt).getUTCFullYear();
  const sequence = receiptRepository.nextSequence(year);

  return receiptRepository.save({
    number: `KD-${year}-${String(sequence).padStart(6, "0")}`,
    paymentId: payment.id,
    kind: session.subscription ? "subscription" : "sale",
    issuedAt,
    merchant: { name: session.storeName, nif: session.storeNif },
    transaction: {
      id: payment.providerRef ?? payment.reference,
      reference: payment.reference,
      method: payment.method,
      target: payment.target,
      paidAt: payment.paidAt ?? issuedAt,
    },
    items: session.items.map((item) => ({ ...item })),
    subtotal: session.total - session.shippingAmount,
    shippingAmount: session.shippingAmount,
    total: session.total,
    currency: session.currency,
  });
}

export function toPublic(r: Receipt): PublicReceipt {
  return {
    ...r,
    issuedAt: iso(r.issuedAt),
    transaction: { ...r.transaction, paidAt: iso(r.transaction.paidAt) },
  };
}

/**
 * The receipt of a paid payment; `null` if the payment is unknown or not paid. A paid payment
 * that somehow has no receipt yet (e.g. confirmed before receipts existed) gets it issued now.
 */
export function getReceipt(paymentId: string): PublicReceipt | null {
  const existing = receiptRepository.byPayment(paymentId);
  if (existing) return toPublic(existing);

  const payment = paymentRepository.get(paymentId);
  if (!payment || payment.status !== "success") return null;
  const session = checkoutRepository.get(payment.sessionId);
  return session ? toPublic(issueReceipt(payment, session)) : null;
}
