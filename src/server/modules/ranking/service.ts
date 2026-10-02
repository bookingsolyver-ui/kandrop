import "server-only";
import { db, must } from "@/server/db/client";

/** Angola is UTC+1 all year: "the month" starts at 00:00 there, which is 23:00 UTC the evening before. */
const LUANDA_OFFSET_MS = 60 * 60 * 1000;

/** `[from, to)` of the month that contains `now`, in epoch milliseconds, on Luanda's calendar. */
export function monthRange(now = Date.now()): { from: number; to: number } {
  const local = new Date(now + LUANDA_OFFSET_MS);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  return { from: Date.UTC(y, m, 1) - LUANDA_OFFSET_MS, to: Date.UTC(y, m + 1, 1) - LUANDA_OFFSET_MS };
}

export interface RankingView {
  /** Start of the month (epoch ms), for the "Top Lojistas de <month>" title. */
  monthStart: number;
  /** Stores with at least one sale this month. */
  ranked: number;
  /** This store's place and numbers, or `null` when it has no sale yet this month. */
  you: { rank: number; sales: number; orders: number } | null;
  /** The best five. Other stores' sales volumes are NOT sent: only this store sees its own numbers. */
  top: Array<{ rank: number; name: string; you: boolean }>;
}

/**
 * The monthly performance ranking, by sales volume (verified, not cancelled; see `monthly_store_ranking`).
 * Returns `null` when the ranking cannot be read (e.g. the migration is not applied): the card then simply hides.
 */
export async function getMonthlyRanking(storeId: string, now = Date.now()): Promise<RankingView | null> {
  const { from, to } = monthRange(now);
  try {
    const rows = must("ranking.month", await db().rpc("monthly_store_ranking", { p_from: from, p_to: to })) ?? [];
    const list = (rows as Array<Record<string, unknown>>).map((r, i) => ({
      rank: i + 1,
      storeId: String(r.store_id),
      name: String(r.store_name || "—"),
      sales: Number(r.sales),
      orders: Number(r.orders),
    }));
    const mine = list.find((r) => r.storeId === storeId);
    return {
      monthStart: from,
      ranked: list.length,
      you: mine ? { rank: mine.rank, sales: mine.sales, orders: mine.orders } : null,
      top: list.slice(0, 5).map((r) => ({ rank: r.rank, name: r.name, you: r.storeId === storeId })),
    };
  } catch {
    return null;
  }
}
