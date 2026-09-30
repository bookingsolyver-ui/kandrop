import { randomBytes } from "node:crypto";
import { getEnv } from "@/server/config/env";
import { orderRepository } from "@/server/modules/orders/repository";
import { COURIERS, couriersFor } from "./couriers";
import { db, must, rows } from "@/server/db/client";
import type { DeliveryRecord } from "./schema";

export const newDeliveryId = () => `dlv_${randomBytes(9).toString("base64url")}`;

/**
 * Sandbox rule for how a trip ends: an order whose number is a multiple of 7 is returned (the
 * customer was not there). Deterministic, so both endings can be seen and tested on purpose.
 */
export const outcomeFor = (orderNumber: number) =>
  orderNumber % 7 === 0 ? "returned" : "delivered";

const toRow = (d: DeliveryRecord) => ({
  id: d.id,
  store_id: d.storeId,
  order_id: d.orderId,
  order_number: d.orderNumber,
  code: d.code,
  zone: d.zone,
  street: d.street,
  reference: d.reference ?? null,
  customer_name: d.customerName,
  courier_id: d.courierId,
  created_at: d.createdAt,
  duration_ms: d.durationMs,
  outcome: d.outcome,
  return_reason: d.returnReason ?? null,
  order_synced: d.orderSynced,
});

const fromRow = (row: Record<string, unknown>): DeliveryRecord => ({
  id: String(row.id),
  storeId: String(row.store_id),
  orderId: String(row.order_id),
  orderNumber: Number(row.order_number),
  code: String(row.code),
  zone: String(row.zone),
  street: String(row.street),
  reference: row.reference === null ? undefined : String(row.reference),
  customerName: String(row.customer_name),
  courierId: String(row.courier_id),
  createdAt: Number(row.created_at),
  durationMs: Number(row.duration_ms),
  outcome: row.outcome as DeliveryRecord["outcome"],
  returnReason: (row.return_reason as DeliveryRecord["returnReason"]) ?? undefined,
  orderSynced: Boolean(row.order_synced),
});

/** The demo orders that shipped already have their deliveries, consistent with their history. */
async function seedIfDemo(storeId: string) {
  if (!(storeId === "sto_demo" || getEnv().KANDROP_DEMO_EVENTS)) return;
  const { count, error } = await db()
    .from("deliveries")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId);
  if (error || count !== 0) return;

  const rows: DeliveryRecord[] = [];
  for (const order of await orderRepository.all(storeId)) {
    const shippedAt = order.history.find((h) => h.status === "shipped")?.at;
    if (shippedAt === undefined || !order.trackingCode) continue;

    const zone = order.address.zone ?? order.address.city;
    const covering = couriersFor(zone);
    // A zone nobody covers: the merchant shipped it themselves, so there is no Kandrop delivery.
    if (covering.length === 0) continue;
    const courier = covering[order.number % covering.length]!;

    const finishedAt = order.history.find(
      (h) => h.status === "delivered" || h.status === "cancelled"
    )?.at;
    const outcome = order.status === "cancelled" ? "returned" : "delivered";
    // Under way: a 70–130 min trip that started when the order shipped.
    const durationMs =
      finishedAt !== undefined ? finishedAt - shippedAt : (70 + (order.number % 61)) * 60_000;
    const returned = order.status === "shipped" ? outcomeFor(order.number) : outcome;

    rows.push({
      id: newDeliveryId(),
      storeId,
      orderId: order.id,
      orderNumber: order.number,
      code: order.trackingCode,
      zone,
      street: order.address.street,
      reference: order.address.reference,
      customerName: order.customer.name,
      courierId: courier.id,
      createdAt: shippedAt,
      durationMs,
      outcome: returned,
      returnReason: returned === "returned" ? "customer_absent" : undefined,
      orderSynced: order.status !== "shipped",
    });
  }
  if (rows.length === 0) return;
  must(
    "deliveries.seed",
    await db()
      .from("deliveries")
      .upsert(rows.map(toRow), { onConflict: "order_id", ignoreDuplicates: true })
  );
}

export const deliveryRepository = {
  async all(storeId: string): Promise<DeliveryRecord[]> {
    await seedIfDemo(storeId);
    const list = rows(
      "deliveries.all",
      await db().from("deliveries").select("*").eq("store_id", storeId)
    );
    return list.map(fromRow);
  },

  async byOrder(storeId: string, orderId: string): Promise<DeliveryRecord | null> {
    await seedIfDemo(storeId);
    const row = must(
      "deliveries.byOrder",
      await db()
        .from("deliveries")
        .select("*")
        .eq("store_id", storeId)
        .eq("order_id", orderId)
        .maybeSingle()
    );
    return row ? fromRow(row) : null;
  },

  async save(delivery: DeliveryRecord): Promise<DeliveryRecord> {
    must("deliveries.save", await db().from("deliveries").upsert(toRow(delivery)));
    return delivery;
  },
};

export { COURIERS };
