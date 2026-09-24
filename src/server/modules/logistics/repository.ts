import { randomBytes } from "node:crypto";
import { getEnv } from "@/server/config/env";
import { orderRepository } from "@/server/modules/orders/repository";
import { COURIERS, couriersFor } from "./couriers";
import type { DeliveryRecord } from "./schema";

/**
 * STUB — in-memory, per process, lost on restart. Replace with a `deliveries` table (unique
 * index on `order_id`, index on `store_id, created_at`). Every call takes the `storeId`.
 */
const g = globalThis as unknown as {
  __kandropDeliveries?: { stores: Map<string, Map<string, DeliveryRecord>>; seeded: Set<string> };
};
const db = (g.__kandropDeliveries ??= { stores: new Map(), seeded: new Set() });

export const newDeliveryId = () => `dlv_${randomBytes(9).toString("base64url")}`;

/**
 * Sandbox rule for how a trip ends: an order whose number is a multiple of 7 is returned (the
 * customer was not there). Deterministic, so both endings can be seen and tested on purpose.
 */
export const outcomeFor = (orderNumber: number) =>
  orderNumber % 7 === 0 ? "returned" : "delivered";

/** The demo orders that shipped already have their deliveries, consistent with their history. */
function seed(storeId: string, rows: Map<string, DeliveryRecord>) {
  for (const order of orderRepository.all(storeId)) {
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

    const id = newDeliveryId();
    rows.set(id, {
      id,
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
}

function rowsOf(storeId: string): Map<string, DeliveryRecord> {
  let rows = db.stores.get(storeId);
  if (!rows) db.stores.set(storeId, (rows = new Map()));
  const demo = storeId === "sto_demo" || getEnv().KANDROP_DEMO_EVENTS;
  if (demo && !db.seeded.has(storeId)) {
    db.seeded.add(storeId);
    seed(storeId, rows);
  }
  return rows;
}

export const deliveryRepository = {
  all: (storeId: string) => [...rowsOf(storeId).values()],
  byOrder: (storeId: string, orderId: string) =>
    [...rowsOf(storeId).values()].find((d) => d.orderId === orderId) ?? null,
  save(delivery: DeliveryRecord) {
    rowsOf(delivery.storeId).set(delivery.id, delivery);
    return delivery;
  },
};

export { COURIERS };
