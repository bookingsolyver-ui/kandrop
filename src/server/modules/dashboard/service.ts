import { getEnv } from "@/server/config/env";
import type { DashboardSummary } from "./schema";
import { reservedAmount } from "@/server/modules/payouts/ledger";
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
  };
}

/**
 * The simulator keeps one balance for every demo store, so each store's own withdrawals are
 * taken off it here. Used by the snapshot and by the live feed, so both always agree.
 */
export function withPayouts(summary: DashboardSummary, storeId: string): DashboardSummary {
  const reserved = reservedAmount(storeId);
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
 * STUB — until orders/payments persistence exists, demo mode serves the simulator and
 * everything else serves an empty (but valid) summary. Replace with real aggregations
 * scoped by `storeId`; the return type is the contract.
 */
export async function getDashboardSummary(storeId: string): Promise<DashboardSummary> {
  const env = getEnv();
  const summary =
    env.KANDROP_DEMO_EVENTS && env.NODE_ENV !== "production" ? snapshot() : emptySummary();
  return withPayouts(summary, storeId);
}
