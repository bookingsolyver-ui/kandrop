import { PLAN_KEYS, type PlanKey } from "@/server/modules/plan/limits";
import { billingRepository } from "./repository";

/**
 * The plan a store is on *right now*: its paid plan while the paid period lasts, Starter
 * otherwise. Worked out from the clock every time, so a lapsed plan cannot linger.
 */
export function planOf(storeId: string, now = Date.now()): PlanKey {
  const sub = billingRepository.subscription(storeId);
  return sub && sub.periodEnd > now ? sub.plan : PLAN_KEYS[0];
}
