import { randomInt } from "node:crypto";
import type { Session } from "@/server/auth/types";
import { ApiError } from "@/server/http/errors";
import { orderRepository } from "@/server/modules/orders/repository";
import { transitionOrder } from "@/server/modules/orders/service";
import {
  DELIVERY_STATUSES,
  STAGE_STARTS,
  dispatchSchema,
  listDeliveriesQuerySchema,
  progressOf,
  stageOf,
  stagesFor,
  statusOfStage,
  type DeliveryStage,
  type DispatchInput,
  type ListDeliveriesQuery,
} from "@/shared/logistics/schemas";
import { COURIER_CAPACITY, courierById, couriersFor } from "./couriers";
import { deliveryRepository, newDeliveryId, outcomeFor } from "./repository";
import type { DeliveryPage, DeliveryRecord, PublicDelivery, PublicProof } from "./schema";

/** SANDBOX: a dispatched trip lasts 45–75 s so the whole life cycle can be watched. */
const TRIP_MIN_MS = 45_000;
const TRIP_MAX_MS = 75_000;

/** Tiny stable hash: the same delivery always gets the same (simulated) proof. */
function seedOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

function proofOf(d: DeliveryRecord): PublicProof {
  const seed = seedOf(d.id);
  const KINDS: PublicProof["kinds"][] = [["photo"], ["signature"], ["photo", "signature"]];
  return {
    kinds: KINDS[seed % KINDS.length]!,
    recipientName: d.customerName,
    deliveredAt: new Date(d.createdAt + d.durationMs).toISOString(),
    seed,
  };
}

function toPublic(d: DeliveryRecord, now: number): PublicDelivery {
  const courier = courierById(d.courierId)!;
  const progress = progressOf(d.createdAt, d.durationMs, now);
  const stage = stageOf(progress, d.outcome);
  const at = (stage_: DeliveryStage) => {
    const start = stage_ === d.outcome ? 1 : STAGE_STARTS[stage_ as keyof typeof STAGE_STARTS];
    const when = d.createdAt + start * d.durationMs;
    return when <= now ? new Date(when).toISOString() : undefined;
  };
  return {
    id: d.id,
    orderId: d.orderId,
    orderNumber: d.orderNumber,
    code: d.code,
    zone: d.zone,
    street: d.street,
    reference: d.reference,
    customerName: d.customerName,
    courier: { id: courier.id, name: courier.name, phone: courier.phone, vehicle: courier.vehicle },
    createdAt: new Date(d.createdAt).toISOString(),
    durationMs: d.durationMs,
    outcome: d.outcome,
    status: statusOfStage(stage),
    stage,
    progress,
    etaAt: new Date(d.createdAt + d.durationMs).toISOString(),
    events: stagesFor(d.outcome).map((s) => ({ stage: s, at: at(s) })),
    returnReason: stage === "returned" ? d.returnReason : undefined,
    proof: stage === "delivered" ? proofOf(d) : undefined,
  };
}

/**
 * When a trip is over, its order follows: delivered, or cancelled if it came back. Done on read
 * (there is no scheduler), once per delivery. If the merchant already moved the order by hand,
 * the transition is a no-op or refused and the delivery is simply marked synced.
 */
function syncOrders(storeId: string, now: number) {
  for (const d of deliveryRepository.all(storeId)) {
    if (d.orderSynced || now < d.createdAt + d.durationMs) continue;
    try {
      transitionOrder(storeId, d.orderId, d.outcome === "delivered" ? "delivered" : "cancelled", {
        force: d.outcome === "returned",
      });
    } catch {
      /* the order was changed by hand in the meantime: nothing more to do */
    }
    d.orderSynced = true;
  }
}

export async function listDeliveries(
  auth: Session,
  rawQuery: ListDeliveriesQuery
): Promise<DeliveryPage> {
  const query = listDeliveriesQuerySchema.parse(rawQuery);
  const now = Date.now();
  syncOrders(auth.storeId, now);

  const all = deliveryRepository
    .all(auth.storeId)
    .map((d) => toPublic(d, now))
    .sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.orderNumber - a.orderNumber
    );

  const counts = Object.fromEntries([
    ["all", all.length],
    ...DELIVERY_STATUSES.map((s) => [s, all.filter((d) => d.status === s).length]),
  ]) as DeliveryPage["counts"];

  const matching = query.status ? all.filter((d) => d.status === query.status) : all;
  const start = (query.page - 1) * query.pageSize;
  return {
    items: matching.slice(start, start + query.pageSize),
    total: matching.length,
    counts,
    page: query.page,
    pageSize: query.pageSize,
    now: new Date(now).toISOString(),
  };
}

/** One delivery of this store. Another store's id is "not found", never "forbidden". */
export async function getDelivery(auth: Session, id: string): Promise<PublicDelivery> {
  const now = Date.now();
  syncOrders(auth.storeId, now);
  const delivery = deliveryRepository.all(auth.storeId).find((d) => d.id === id);
  if (!delivery) throw new ApiError("not_found");
  return toPublic(delivery, now);
}

/**
 * One click: picks the courier for the order's zone (the one carrying the fewest deliveries, up
 * to `COURIER_CAPACITY`), creates the delivery and ships the order with its tracking code.
 * Owner only. Refuses anything that is not waiting to ship, or has a delivery already.
 */
export async function dispatchOrder(auth: Session, input: DispatchInput): Promise<PublicDelivery> {
  if (auth.role !== "owner") throw new ApiError("forbidden");
  const { orderId } = dispatchSchema.parse(input);
  const order = orderRepository.get(auth.storeId, orderId);
  if (!order) throw new ApiError("not_found");
  if (order.status !== "processing") throw new ApiError("order_not_dispatchable");
  if (deliveryRepository.byOrder(auth.storeId, orderId)) throw new ApiError("delivery_exists");

  const now = Date.now();
  const zone = order.address.zone ?? order.address.city;
  const load = (courierId: string) =>
    deliveryRepository
      .all(auth.storeId)
      .filter((d) => d.courierId === courierId && now < d.createdAt + d.durationMs).length;
  const courier = couriersFor(zone)
    .map((c) => ({ c, load: load(c.id) }))
    .filter(({ load }) => load < COURIER_CAPACITY)
    .sort((a, b) => a.load - b.load || a.c.id.localeCompare(b.c.id))[0]?.c;
  if (!courier) throw new ApiError("no_courier_available");

  const code = `KD${4_000_000 + randomInt(0, 999_999)}AO`;
  transitionOrder(auth.storeId, order.id, "shipped", { trackingCode: code });

  const outcome = outcomeFor(order.number);
  const delivery = deliveryRepository.save({
    id: newDeliveryId(),
    storeId: auth.storeId,
    orderId: order.id,
    orderNumber: order.number,
    code,
    zone,
    street: order.address.street,
    reference: order.address.reference,
    customerName: order.customer.name,
    courierId: courier.id,
    createdAt: now,
    durationMs: randomInt(TRIP_MIN_MS, TRIP_MAX_MS + 1),
    outcome,
    returnReason: outcome === "returned" ? "customer_absent" : undefined,
    orderSynced: false,
  });
  return toPublic(delivery, now);
}
