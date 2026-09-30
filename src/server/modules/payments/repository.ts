import { db, must, rows } from "@/server/db/client";
import type { PaymentRecord } from "./schema";

const toRow = (p: PaymentRecord) => ({
  id: p.id,
  reference: p.reference,
  session_id: p.sessionId,
  method: p.method,
  status: p.status,
  amount: p.amount,
  currency: p.currency,
  failure_code: p.failureCode ?? null,
  target: p.target,
  created_at: p.createdAt,
  paid_at: p.paidAt ?? null,
  provider_ref: p.providerRef ?? null,
  settle: p.settle ?? null,
});

function fromRow(row: Record<string, unknown>): PaymentRecord {
  return {
    id: String(row.id),
    reference: String(row.reference),
    sessionId: String(row.session_id),
    method: row.method as PaymentRecord["method"],
    status: row.status as PaymentRecord["status"],
    amount: Number(row.amount),
    currency: "AOA",
    failureCode: (row.failure_code as PaymentRecord["failureCode"]) ?? undefined,
    target: String(row.target),
    createdAt: Number(row.created_at),
    paidAt: row.paid_at === null ? undefined : Number(row.paid_at),
    providerRef: row.provider_ref === null ? undefined : String(row.provider_ref),
    settle: (row.settle as PaymentRecord["settle"]) ?? undefined,
  };
}

async function one(op: string, column: string, value: string): Promise<PaymentRecord | null> {
  const row = must(
    `payments.${op}`,
    await db().from("payments").select("*").eq(column, value).maybeSingle()
  );
  return row ? fromRow(row) : null;
}

export const paymentRepository = {
  get: (id: string) => one("get", "id", id),
  byReference: (reference: string) => one("byReference", "reference", reference),
  byProviderRef: (ref: string) => one("byProviderRef", "provider_ref", ref),

  async save(payment: PaymentRecord): Promise<PaymentRecord> {
    must("payments.save", await db().from("payments").upsert(toRow(payment)));
    return payment;
  },

  /** Newest first. */
  async bySession(sessionId: string): Promise<PaymentRecord[]> {
    const list = rows(
      "payments.bySession",
      await db()
        .from("payments")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
    );
    return list.map(fromRow);
  },
};
