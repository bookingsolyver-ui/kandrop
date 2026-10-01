import { PLANS, PLAN_PRICES } from "@/server/modules/plan/limits";

/** One line of a plan card: a key of `Marketing.pricing.features`. */
export type FeatureKey =
  | `s${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`
  | `p${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7}`
  | `e${0 | 1 | 2 | 3 | 4 | 5 | 6}`;

export interface Feature {
  key: FeatureKey;
  /** Interpolated into the text (`{count}`): the real, enforced limit when there is one. */
  count?: number;
  /** The "Tudo do Starter, mais:" line that introduces what the plan adds. */
  lead?: boolean;
}

export interface Tier {
  key: "starter" | "pro" | "elite";
  /** Whole Kwanzas per month; `null` = "on request" (Elite is sold through the team, not through the checkout). */
  price: number | null;
  featured?: boolean;
  features: Feature[];
}

/**
 * The commercial offer. Starter and Pro are the plans the platform bills (`plan/limits.ts` holds their real prices and
 * limits, so what is advertised and what is charged cannot drift apart). Elite has no price and no checkout: its button
 * talks to the team.
 */
export const TIERS: Tier[] = [
  {
    key: "starter",
    price: PLAN_PRICES.starter,
    features: [
      { key: "s1" },
      { key: "s2" },
      { key: "s3", count: PLANS.starter.landingPages },
      { key: "s4" },
      { key: "s5" },
      { key: "s6" },
      { key: "s7" },
      { key: "s8" },
      { key: "s9" },
    ],
  },
  {
    key: "pro",
    price: PLAN_PRICES.pro,
    featured: true,
    features: [
      { key: "p0", lead: true },
      { key: "p1", count: PLANS.pro.landingPages },
      { key: "p2" },
      { key: "p3" },
      { key: "p4" },
      { key: "p5" },
      { key: "p6" },
      { key: "p7" },
    ],
  },
  {
    key: "elite",
    price: null,
    features: [
      { key: "e0", lead: true },
      { key: "e1" },
      { key: "e2" },
      { key: "e3" },
      { key: "e4" },
      { key: "e5" },
      { key: "e6" },
    ],
  },
];
