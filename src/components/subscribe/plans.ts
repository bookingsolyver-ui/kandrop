import { TIERS, type Feature } from "@/components/marketing/tiers";
import type { PlanKey } from "@/server/modules/plan/limits";

export type PlanFeature = Feature;

/** What each billable plan lists: the very lines of the pricing page (one source, `marketing/tiers.ts`). */
export const PLAN_FEATURES: Record<PlanKey, PlanFeature[]> = {
  starter: TIERS.find((tier) => tier.key === "starter")!.features,
  pro: TIERS.find((tier) => tier.key === "pro")!.features,
};
