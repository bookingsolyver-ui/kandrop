import { PLANS, type PlanKey } from "@/server/modules/plan/limits";

export interface PlanFeature {
  /** A key of `Marketing.pricing.features` (the same wording as the landing page). */
  key:
    | "products"
    | "productsUnlimited"
    | "landingPages"
    | "landingPagesUnlimited"
    | "multicaixa"
    | "payouts"
    | "whatsapp"
    | "logistics"
    | "logisticsPriority";
  count?: number;
  /** Not built yet: tagged "Soon" rather than promised. */
  soon?: boolean;
}

/** What each plan lists. The limits are the real ones the platform enforces. */
export const PLAN_FEATURES: Record<PlanKey, PlanFeature[]> = {
  starter: [
    { key: "products", count: PLANS.starter.products },
    { key: "landingPages", count: PLANS.starter.landingPages },
    { key: "multicaixa" },
    { key: "payouts" },
  ],
  pro: [
    { key: "productsUnlimited" },
    { key: "landingPagesUnlimited" },
    { key: "multicaixa" },
    { key: "payouts" },
    { key: "whatsapp", soon: true },
    { key: "logistics", soon: true },
    { key: "logisticsPriority", soon: true },
  ],
};
