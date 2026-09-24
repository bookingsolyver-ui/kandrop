import type { Receipt } from "./schema";

/**
 * STUB — in-memory, per process. Replace with a `receipts` table: unique index on `payment_id`
 * (one receipt per payment) and a real sequence per year for `number`. Numbers restart with the
 * process here, so they are only unique within one run.
 */
const g = globalThis as unknown as {
  __kandropReceipts?: { byPayment: Map<string, Receipt>; counters: Map<number, number> };
};
const db = (g.__kandropReceipts ??= { byPayment: new Map(), counters: new Map() });

export const receiptRepository = {
  byPayment: (paymentId: string) => db.byPayment.get(paymentId) ?? null,
  save(receipt: Receipt) {
    db.byPayment.set(receipt.paymentId, receipt);
    return receipt;
  },
  /** Next sequence value for `year` (1, 2, 3…). */
  nextSequence(year: number) {
    const next = (db.counters.get(year) ?? 0) + 1;
    db.counters.set(year, next);
    return next;
  },
};
