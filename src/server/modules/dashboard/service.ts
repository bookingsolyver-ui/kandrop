import type { DashboardSummary } from "./schema";
import { reservedAmount } from "@/server/modules/payouts/ledger";
import { isDemoStore } from "@/server/modules/store/demo";
import { snapshot } from "./simulator";

const PERIOD_DAYS = 14;

function emptySummary(): DashboardSummary {
  const zero = { amount: 0, currency: "AOA" as const };
  return {
    periodDays: PERIOD_DAYS,
    grossRevenue: { value: zero, changePct: 0 },
    netRevenue: { value: zero, changePct: 0, marginRate: 0 },
    pendingOrders: { count: 0, value: zero },
    availableBalance: { value: zero, releasing: zero },
    revenueSeries: [],
    topProducts: [],
    updatedAt: new Date().toISOString(),
    demo: false,
  };
}

/**
 * The simulator keeps one balance for every demo store, so each store's own withdrawals are
 * taken off it here. Used by the snapshot and by the live feed, so both always agree.
 */
export async function withPayouts(
  summary: DashboardSummary,
  storeId: string
): Promise<DashboardSummary> {
  const reserved = await reservedAmount(storeId);
  if (reserved === 0) return summary;
  const { value } = summary.availableBalance;
  return {
    ...summary,
    availableBalance: {
      ...summary.availableBalance,
      value: { ...value, amount: value.amount - reserved },
    },
  };
}

/**
 * STUB — until the summary is aggregated from the orders/payments tables, demo mode
 * (`KANDROP_DEMO_EVENTS=true`, on a deployed demo too) serves the simulator's starting numbers and
 * everything else serves an empty (but valid) summary. Demo mode is an explicit opt-in: it is never
 * switched on just because the database is empty, or a real merchant would see made-up revenue. Replace with real aggregations
 * scoped by `storeId`; the return type is the contract.
 */
export async function getDashboardSummary(storeId: string): Promise<DashboardSummary> {
  const summary = (await isDemoStore(storeId)) ? snapshot() : emptySummary();
  return await withPayouts(summary, storeId);
}
