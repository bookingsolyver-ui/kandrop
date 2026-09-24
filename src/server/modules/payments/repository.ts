import type { PaymentRecord } from "./schema";

/** STUB — in-memory, per process. Replace with a payments table (index on `sessionId`). */
const g = globalThis as unknown as { __kandropPayments?: Map<string, PaymentRecord> };
const payments = (g.__kandropPayments ??= new Map<string, PaymentRecord>());

export const paymentRepository = {
  get: (id: string) => payments.get(id) ?? null,
  save(payment: PaymentRecord) {
    payments.set(payment.id, payment);
    return payment;
  },
  byProviderRef: (ref: string) => [...payments.values()].find((p) => p.providerRef === ref) ?? null,
  /** Newest first. */
  bySession(sessionId: string) {
    return [...payments.values()]
      .filter((p) => p.sessionId === sessionId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
};
