import "server-only";
import type { Session } from "@/server/auth/types";
import { ApiError } from "@/server/http/errors";
import {
  DELIVERY_STATUSES,
  STAGE_STARTS,
  listDeliveriesQuerySchema,
  progressOf,
  stageOf,
  stagesFor,
  statusOfStage,
  type DeliveryStage,
  type ListDeliveriesQuery,
} from "@/shared/logistics/schemas";
import { courierById } from "./couriers";
import { deliveryRepository } from "./repository";
import type { DeliveryPage, DeliveryRecord, PublicDelivery, PublicProof } from "./schema";

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

export async function listDeliveries(
  auth: Session,
  rawQuery: ListDeliveriesQuery
): Promise<DeliveryPage> {
  const query = listDeliveriesQuerySchema.parse(rawQuery);
  const now = Date.now();

  const all = (await deliveryRepository.all(auth.storeId))
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
  const delivery = (await deliveryRepository.all(auth.storeId)).find((d) => d.id === id);
  if (!delivery) throw new ApiError("not_found");
  return toPublic(delivery, now);
}
