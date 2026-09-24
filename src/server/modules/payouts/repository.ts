import { randomBytes } from "node:crypto";
import { getEnv } from "@/server/config/env";
import type { PayoutRecord } from "./schema";

/**
 * STUB — in-memory, per process, lost on restart. Replace with a `payouts` table (index on
 * `store_id, created_at`) and a real yearly sequence for `reference`. Every call takes the
 * `storeId`, so tenant scoping cannot be forgotten by a caller.
 */
const g = globalThis as unknown as {
  __kandropPayouts?: {
    stores: Map<string, Map<string, PayoutRecord>>;
    seeded: Set<string>;
    counters: Map<number, number>;
  };
};
const db = (g.__kandropPayouts ??= { stores: new Map(), seeded: new Set(), counters: new Map() });

const KZ = 100;
const DAY = 24 * 60 * 60 * 1000;

export const newPayoutId = () => `pot_${randomBytes(9).toString("base64url")}`;

export function nextReference(now = Date.now()): string {
  const year = new Date(now).getUTCFullYear();
  const next = (db.counters.get(year) ?? 0) + 1;
  db.counters.set(year, next);
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

function seed(storeId: string, rows: Map<string, PayoutRecord>) {
  const now = Date.now();
  // Oldest first, so the sequential references read in chronological order.
  [...DEMO_HISTORY].reverse().forEach(([daysAgo, kz]) => {
    const createdAt = now - daysAgo * DAY;
    const id = newPayoutId();
    rows.set(id, {
      id,
      storeId,
      reference: nextReference(createdAt),
      amount: kz * KZ,
      currency: "AOA",
      status: "completed",
      bank: { holderName: "Loja Demo, Lda.", ibanMasked: "AO06 •••• •••• •••• •••• 4821" },
      createdAt,
      completeAt: createdAt + 20_000,
      completedAt: createdAt + 20_000,
      historical: true,
    });
  });
}

function rowsOf(storeId: string): Map<string, PayoutRecord> {
  let rows = db.stores.get(storeId);
  if (!rows) db.stores.set(storeId, (rows = new Map()));
  // Same rule as the orders' demo data: the sandbox store, or any store when demo mode is on.
  const demo = storeId === "sto_demo" || getEnv().KANDROP_DEMO_EVENTS;
  if (demo && !db.seeded.has(storeId)) {
    db.seeded.add(storeId);
    seed(storeId, rows);
  }
  return rows;
}

export const payoutRepository = {
  all: (storeId: string) => [...rowsOf(storeId).values()],
  save(payout: PayoutRecord) {
    rowsOf(payout.storeId).set(payout.id, payout);
    return payout;
  },
};
