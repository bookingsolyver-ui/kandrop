import { z } from "zod";

/** Messages are stable CODES; the UI translates `Logistics.validation.<code>`. */
export type LogisticsValidationCode = "order_required" | "order_invalid";

export const DELIVERY_STATUSES = ["in_transit", "delivered", "returned"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

/** Where a delivery is on its way. `delivered` and `returned` are the two possible endings. */
export type DeliveryStage = "assigned" | "picked_up" | "in_transit" | "delivered" | "returned";
export type DeliveryOutcome = "delivered" | "returned";

export const VEHICLES = ["moto", "car"] as const;
export type Vehicle = (typeof VEHICLES)[number];

export const RETURN_REASONS = ["customer_absent"] as const;
export type ReturnReason = (typeof RETURN_REASONS)[number];

/**
 * Fraction of the trip at which each stage begins. A delivery is a pure function of the time
 * since it was dispatched, so the server and every open browser agree on where it is without
 * anything having to be pushed: the client just re-computes it every second.
 */
export const STAGE_STARTS = { assigned: 0, picked_up: 0.2, in_transit: 0.4 } as const;

export const progressOf = (createdAt: number, durationMs: number, now: number) =>
  durationMs <= 0 ? 1 : Math.min(1, Math.max(0, (now - createdAt) / durationMs));

export function stageOf(progress: number, outcome: DeliveryOutcome): DeliveryStage {
  if (progress >= 1) return outcome;
  if (progress >= STAGE_STARTS.in_transit) return "in_transit";
  if (progress >= STAGE_STARTS.picked_up) return "picked_up";
  return "assigned";
}

export const statusOfStage = (stage: DeliveryStage): DeliveryStatus =>
  stage === "delivered" ? "delivered" : stage === "returned" ? "returned" : "in_transit";

/** The four steps of a trip, ending in whichever outcome this one has. */
export const stagesFor = (outcome: DeliveryOutcome): DeliveryStage[] => [
  "assigned",
  "picked_up",
  "in_transit",
  outcome,
];

export const dispatchSchema = z.object({
  orderId: z
    .string({ error: "order_required" })
    .regex(/^ord_[A-Za-z0-9_-]{8,32}$/, { error: "order_invalid" }),
});
export type DispatchInput = z.input<typeof dispatchSchema>;

export const listDeliveriesQuerySchema = z.object({
  status: z.enum(DELIVERY_STATUSES).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
export type ListDeliveriesQuery = z.input<typeof listDeliveriesQuerySchema>;

export function firstLogisticsError(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>
): Record<string, LogisticsValidationCode> {
  const out: Record<string, LogisticsValidationCode> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !(field in out)) out[field] = issue.message as LogisticsValidationCode;
  }
  return out;
}
