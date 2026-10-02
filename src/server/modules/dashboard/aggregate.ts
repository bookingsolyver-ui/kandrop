import { splitSale } from "@/server/modules/fulfilment/split";
import type { OrderRecord } from "@/server/modules/orders/schema";
import { isPaymentVerified } from "@/shared/payments/orderPayment";
import type { DashboardSummary } from "./schema";

export const PERIOD_DAYS = 14;
const DAY = 86_400_000;
const AOA = (amount: number) => ({ amount, currency: "AOA" as const });
const dayStart = (ms: number) => Math.floor(ms / DAY) * DAY;
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The merchant's net of a supplier line, by order id (what the commission split fixed at the time of the sale). */
export type LineNets = Map<string, number>;

export interface AggregateInput {
  orders: OrderRecord[];
  /** `merchant_net` of the supplier lines of this store, by order id. */
  lineNets: LineNets;
  /** Cost price of the store's own products, by product id (for orders without a supplier line). */
  costs: Map<string, number>;
  commissionBps: number;
  now: number;
}

/**
 * What the merchant keeps from an order: the supplier line's net when there is one (fixed at the sale); for the
 * merchant's own products the same rule applied to the product's cost; unknown (an old order without a product id) = 0.
 */
export function netOf(order: OrderRecord, input: Pick<AggregateInput, "lineNets" | "costs" | "commissionBps">): number {
  const fixed = input.lineNets.get(order.id);
  if (fixed !== undefined) return fixed;
  let net = 0;
  for (const item of order.items) {
    const cost = item.productId ? input.costs.get(item.productId) : undefined;
    if (cost === undefined) continue;
    net += splitSale(item.unitAmount, cost, item.quantity, input.commissionBps).merchantNet;
  }
  // A coupon is paid out of the merchant's margin (the supplier line already has it in its fixed net).
  return net - (order.payment.coupon?.discount ?? 0);
}

const pct = (current: number, previous: number) => (previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : 0);

/**
 * The dashboard's numbers from the store's REAL orders. Revenue counts only orders whose payment Kandrop VERIFIED
 * (`paid_verified`) and that are not cancelled, on the day the payment was confirmed. The available balance is what
 * the merchant keeps from verified orders that were DELIVERED; the "releasing" amount is what is still on its way.
 * Pure: the same input always gives the same summary.
 */
export function aggregateSummary(input: AggregateInput): DashboardSummary {
  const { orders, now } = input;
  const today = dayStart(now);
  const from = today - (PERIOD_DAYS - 1) * DAY;
  const prevFrom = from - PERIOD_DAYS * DAY;
  const live = orders.filter((o) => o.status !== "cancelled");
  const earned = live.filter((o) => isPaymentVerified(o.paymentStatus));
  const paidAt = (o: OrderRecord) => o.payment.paidAt || o.createdAt;

  const inWindow = earned.filter((o) => paidAt(o) >= from);
  const inPrevious = earned.filter((o) => paidAt(o) >= prevFrom && paidAt(o) < from);
  const sum = (list: OrderRecord[], pick: (o: OrderRecord) => number) => list.reduce((n, o) => n + pick(o), 0);
  const gross = sum(inWindow, (o) => o.total);
  const net = sum(inWindow, (o) => netOf(o, input));
  const prevGross = sum(inPrevious, (o) => o.total);
  const prevNet = sum(inPrevious, (o) => netOf(o, input));

  const open = live.filter((o) => o.status === "pending" || o.status === "processing");
  const delivered = earned.filter((o) => o.status === "delivered");
  const unfinished = live.filter((o) => o.status !== "delivered");

  const series = Array.from({ length: PERIOD_DAYS }, (_, i) => {
    const day = from + i * DAY;
    const ofDay = inWindow.filter((o) => dayStart(paidAt(o)) === day);
    return { date: iso(day), gross: sum(ofDay, (o) => o.total), net: sum(ofDay, (o) => netOf(o, input)) };
  });

  const products = new Map<string, { id: string; name: string; units: number; revenue: number; net: number }>();
  for (const o of inWindow) {
    const orderNet = netOf(o, input);
    const orderGross = o.items.reduce((n, i) => n + i.unitAmount * i.quantity, 0) || 1;
    for (const item of o.items) {
      const key = item.productId ?? item.name;
      const revenue = item.unitAmount * item.quantity;
      const row = products.get(key) ?? { id: key, name: item.name, units: 0, revenue: 0, net: 0 };
      row.units += item.quantity;
      row.revenue += revenue;
      row.net += Math.round((orderNet * revenue) / orderGross);
      products.set(key, row);
    }
  }
  const topProducts = [...products.values()]
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
    .slice(0, 5)
    .map((p) => ({ id: p.id, name: p.name, unitsSold: p.units, revenue: p.revenue, marginRate: p.revenue > 0 ? Math.min(1, Math.max(0, p.net / p.revenue)) : 0 }));

  const placed = live.filter((o) => o.createdAt >= from);
  const verifiedPlaced = placed.filter((o) => isPaymentVerified(o.paymentStatus)).length;
  const count = (s: OrderRecord["status"]) => orders.filter((o) => o.status === s && o.createdAt >= from).length;

  return {
    periodDays: PERIOD_DAYS,
    grossRevenue: { value: AOA(gross), changePct: pct(gross, prevGross) },
    netRevenue: { value: AOA(net), changePct: pct(net, prevNet), marginRate: gross > 0 ? Math.min(1, Math.max(0, net / gross)) : 0 },
    pendingOrders: { count: open.length, value: AOA(sum(open, (o) => o.total)) },
    availableBalance: { value: AOA(sum(delivered, (o) => netOf(o, input))), releasing: AOA(sum(unfinished, (o) => netOf(o, input))) },
    revenueSeries: series,
    topProducts,
    extras: {
      orders: placed.length,
      avgTicket: placed.length > 0 ? Math.round(sum(placed, (o) => o.total) / placed.length) : 0,
      // There is no cart or refund tracking yet: zero is the honest number, not a guess.
      abandonedCarts: 0,
      refunded: 0,
      chargebacks: 0,
      orderStatus: { preparing: count("pending") + count("processing"), shipped: count("shipped"), delivered: count("delivered"), returned: 0 },
      paymentMethods: (["multicaixa_express", "unitel_money", "card", "bank_transfer"] as const).map((method) => ({
        method,
        conversion: method === "bank_transfer" && placed.length > 0 ? Math.round((verifiedPlaced / placed.length) * 100) : 0,
        sales: method === "bank_transfer" ? verifiedPlaced : 0,
      })),
    },
    updatedAt: new Date(now).toISOString(),
    demo: false,
  };
}
