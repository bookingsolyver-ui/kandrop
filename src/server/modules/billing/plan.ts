import type { PlanKey } from "@/server/modules/plan/limits";
import { billingRepository } from "./repository";

/**
 * The plan a store is on *right now*: its plan while the paid period lasts, `null` when there is
 * none (never paid, or the period ran out). Worked out from the clock every time, so a lapsed
 * plan cannot linger. `null` is what the payment gate keys on.
 */
export function planOf(storeId: string, now = Date.now()): PlanKey | null {
  const sub = billingRepository.subscription(storeId);
  return sub && sub.periodEnd > now ? sub.plan : null;
}

/** Whether the store has an active paid period (the payment gate). */
export const hasActiveSubscription = (storeId: string, now = Date.now()) =>
  planOf(storeId, now) !== null;
