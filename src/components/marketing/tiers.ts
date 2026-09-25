import { PLANS, PLAN_PRICES } from "@/server/modules/plan/limits";

export type FeatureKey =
  | "products"
  | "productsUnlimited"
  | "landingPages"
  | "landingPagesUnlimited"
  | "multicaixa"
  | "payouts"
  | "catalog"
  | "whatsapp"
  | "logistics"
  | "logisticsPriority";

export interface Feature {
  key: FeatureKey;
  count?: number;
  /** Not built yet. The page says so ("Soon") rather than promise it as if it were live. */
  soon?: boolean;
}

export interface Tier {
  key: "starter" | "pro";
  /** Whole Kwanzas per month; `0` renders as "Free". */
  price: number;
  featured?: boolean;
  features: Feature[];
}

/**
 * The two plans (see `plan/limits.ts`: there is no free tier). Prices and Starter's limits are the
 * real ones the platform uses; features flagged `soon` are not built yet and are tagged "Soon"
 * rather than promised.
 */
export const TIERS: Tier[] = [
  {
    key: "starter",
    price: PLAN_PRICES.starter,
    features: [
      { key: "products", count: PLANS.starter.products },
      { key: "landingPages", count: PLANS.starter.landingPages },
      { key: "multicaixa" },
      { key: "payouts" },
    ],
  },
  {
    key: "pro",
    price: PLAN_PRICES.pro,
    featured: true,
    features: [
      { key: "productsUnlimited" },
      { key: "landingPagesUnlimited" },
      { key: "multicaixa" },
      { key: "payouts" },
      { key: "catalog", soon: true },
      { key: "whatsapp", soon: true },
      { key: "logistics", soon: true },
      { key: "logisticsPriority", soon: true },
    ],
  },
];
