import type { DashboardSummary } from "./schema";

/** STUB — replace with real aggregation queries. Kept pure so routes and SSE share it. */
export async function getDashboardSummary(storeId: string): Promise<DashboardSummary> {
  void storeId;
  return {
    volumeToday: { amount: 0, currency: "AOA" },
    transactionsToday: 0,
    successRate: 1,
    pendingSettlement: { amount: 0, currency: "AOA" },
    updatedAt: new Date().toISOString(),
  };
}
