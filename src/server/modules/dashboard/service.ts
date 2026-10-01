import type { DashboardSummary } from "./schema";
import { reservedAmount } from "@/server/modules/payouts/ledger";
import { getEnv } from "@/server/config/env";
import { db, must } from "@/server/db/client";
import { orderRepository } from "@/server/modules/orders/repository";
import { productRepository } from "@/server/modules/products/repository";
import { aggregateSummary } from "./aggregate";

/**
 * Each store's own withdrawals are taken off its available balance here. Used by the snapshot and by the live
 * feed, so both always agree.
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
 * The dashboard's numbers, aggregated from THIS store's real orders (see `aggregate.ts`): nothing is simulated.
 * Every query is scoped by `storeId`.
 */
export async function getDashboardSummary(storeId: string): Promise<DashboardSummary> {
  const [orders, lines, products] = await Promise.all([
    orderRepository.all(storeId),
    db().from("supplier_orders").select("order_id,merchant_net").eq("store_id", storeId).then((r) => must("dashboard.lines", r) ?? []),
    productRepository.all(storeId),
  ]);
  const summary = aggregateSummary({
    orders,
    lineNets: new Map(lines.map((l) => [String(l.order_id), Number(l.merchant_net)])),
    costs: new Map(products.map((p) => [p.id, p.costPrice])),
    commissionBps: getEnv().COMMISSION_BPS,
    now: Date.now(),
  });
  return await withPayouts(summary, storeId);
}
