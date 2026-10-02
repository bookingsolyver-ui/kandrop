import "server-only";
import { randomBytes } from "node:crypto";
import { isDemoStore } from "@/server/modules/store/demo";
import { db, isUniqueViolation, must, rows } from "@/server/db/client";
import { ApiError } from "@/server/http/errors";
import type { PayoutRecord } from "./schema";

const KZ = 100;
const DAY = 24 * 60 * 60 * 1000;

export const newPayoutId = () => `pot_${randomBytes(9).toString("base64url")}`;

/** `LV-2026-000001`: a per-year sequence, atomic in the database. */
export async function nextReference(now = Date.now()): Promise<string> {
  const year = new Date(now).getUTCFullYear();
  const next = Number(
    must("payouts.sequence", await db().rpc("next_sequence", { seq_name: `payout:${year}` }))
  );
  return `LV-${year}-${String(next).padStart(6, "0")}`;
}

/** [days ago, amount in Kz] — a believable month-by-month history for the demo store. */
const DEMO_HISTORY: Array<[number, number]> = [
  [4, 300_000],
  [11, 450_000],
  [18, 250_000],
  [27, 600_000],
  [41, 200_000],
  [56, 350_000],
  [70, 500_000],
];

const toRow = (p: PayoutRecord) => ({
  id: p.id,
  store_id: p.storeId,
  reference: p.reference,
  amount: p.amount,
  fee: p.fee,
  currency: p.currency,
  status: p.status,
  bank: p.bank,
  created_at: p.createdAt,
  complete_at: p.completeAt,
  completed_at: p.completedAt ?? null,
  historical: p.historical ?? false,
});

const fromRow = (row: Record<string, unknown>): PayoutRecord => ({
  id: String(row.id),
  storeId: String(row.store_id),
  reference: String(row.reference),
  amount: Number(row.amount),
  fee: Number(row.fee ?? 0),
  currency: "AOA",
  status: row.status as PayoutRecord["status"],
  bank: row.bank as PayoutRecord["bank"],
  createdAt: Number(row.created_at),
  completeAt: Number(row.complete_at),
  completedAt: row.completed_at === null ? undefined : Number(row.completed_at),
  historical: row.historical ? true : undefined,
});

/** Sandbox stores (or any store when demo mode is on) start with a month-by-month history. */
async function seedIfDemo(storeId: string) {
  if (!(await isDemoStore(storeId))) return;
  const { count, error } = await db()
    .from("payouts")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId);
  if (error || count !== 0) return;

  const now = Date.now();
  const rows: PayoutRecord[] = [];
  // Oldest first, so the sequential references read in chronological order.
  for (const [daysAgo, kz] of [...DEMO_HISTORY].reverse()) {
    const createdAt = now - daysAgo * DAY;
    rows.push({
      id: newPayoutId(),
      storeId,
      reference: await nextReference(createdAt),
      amount: kz * KZ,
      fee: 0,
      currency: "AOA",
      status: "completed",
      bank: { holderName: "Loja Demo, Lda.", ibanMasked: "AO06 •••• •••• •••• •••• 4821" },
      createdAt,
      completeAt: createdAt + 20_000,
      completedAt: createdAt + 20_000,
      historical: true,
    });
  }
  must("payouts.seed", await db().from("payouts").insert(rows.map(toRow)));
}

export const payoutRepository = {
  async all(storeId: string): Promise<PayoutRecord[]> {
    await seedIfDemo(storeId);
    const list = rows("payouts.all", await db().from("payouts").select("*").eq("store_id", storeId));
    return list.map(fromRow);
  },

  /**
   * A NEW payout request. The database allows one `pending` payout per store (partial unique index), so a second
   * simultaneous request is refused here with `payout_pending`, whatever the checks before it saw.
   */
  async create(payout: PayoutRecord): Promise<PayoutRecord> {
    const { error } = await db().from("payouts").insert(toRow(payout));
    if (isUniqueViolation(error)) throw new ApiError("payout_pending");
    must("payouts.create", { data: null, error });
    return payout;
  },

  async save(payout: PayoutRecord): Promise<PayoutRecord> {
    must("payouts.save", await db().from("payouts").upsert(toRow(payout)));
    return payout;
  },
};
