/**
 * Plans: their limits and their price. Plain constants (no imports) so the plan service, the
 * billing module and every module that enforces a limit can read them without depending on
 * each other. `null` means unlimited.
 *
 * !! PLACEHOLDER PRICES !! There is no commercial decision behind Growth and Scale — they are
 * proposals so the pages can be designed and reviewed. Confirm them (and the tax treatment,
 * Angolan IVA) before anyone is charged for real. Only the *limits* of products and landing
 * pages are enforced by the platform; the other advantages listed on the plan cards are not
 * gated yet.
 */
export const PLAN_KEYS = ["starter", "growth", "scale"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export const PLANS = {
  starter: { landingPages: 5, products: 50 },
  growth: { landingPages: 25, products: 500 },
  scale: { landingPages: null, products: null },
} as const satisfies Record<PlanKey, { landingPages: number | null; products: number | null }>;

/** Whole Kwanzas per month; `0` = free. */
export const PLAN_PRICES: Record<PlanKey, number> = { starter: 0, growth: 19_900, scale: 49_900 };

/** Higher is bigger: an upgrade goes up this scale, a paid plan is never "downgraded" into. */
export const planRank = (plan: PlanKey) => PLAN_KEYS.indexOf(plan);
