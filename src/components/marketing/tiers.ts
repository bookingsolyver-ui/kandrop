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
  key: "starter" | "growth" | "scale";
  /** Whole Kwanzas per month; `0` renders as "Free". */
  price: number;
  featured?: boolean;
  features: Feature[];
}

/**
 * !! PLACEHOLDER PRICES !! There is no commercial decision behind the Growth and Scale numbers
 * — they are proposals so the page can be designed and reviewed. Confirm (or replace) them, and
 * the tax treatment (Angolan IVA), before this page is public. Starter's limits are the real
 * ones the platform already enforces (`plan/limits.ts`); the other limits are proposals too.
 * Features flagged `soon` are not built yet.
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
    key: "growth",
    price: PLAN_PRICES.growth,
    featured: true,
    features: [
      { key: "products", count: PLANS.growth.products },
      { key: "landingPages", count: PLANS.growth.landingPages },
      { key: "multicaixa" },
      { key: "payouts" },
      { key: "catalog", soon: true },
      { key: "whatsapp", soon: true },
    ],
  },
  {
    key: "scale",
    price: PLAN_PRICES.scale,
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
