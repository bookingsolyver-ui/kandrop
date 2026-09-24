import type { Session } from "@/server/auth/types";
import { planOf } from "@/server/modules/billing/plan";
import { productRepository } from "@/server/modules/products/repository";
import { PLANS, type PlanKey } from "./limits";

/** `limit: null` = unlimited. */
export interface Meter {
  used: number;
  limit: number | null;
}

export interface PlanUsage {
  plan: PlanKey;
  usage: { landingPages: Meter; products: Meter };
}

/** What the store has used of its plan. Only numbers that really exist are reported. */
export async function getPlan(auth: Session): Promise<PlanUsage> {
  const plan = planOf(auth.storeId);
  const limits = PLANS[plan];
  return {
    plan,
    usage: {
      // Landing pages are not built yet, so the honest count is zero.
      landingPages: { used: 0, limit: limits.landingPages },
      products: { used: productRepository.all(auth.storeId).length, limit: limits.products },
    },
  };
}
