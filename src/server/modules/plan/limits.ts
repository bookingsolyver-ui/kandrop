/**
 * Plans: their limits and their price. Plain constants (no imports) so the plan service, the
 * billing module and every module that enforces a limit can read them without depending on
 * each other. `null` means unlimited.
 *
 * There is NO free plan: the dashboard is behind a payment gate (an account without an active
 * paid period is sent to `/checkout`). Starter and Pro at 4.999 / 11.999 Kz a month are the
 * current commercial offer (the Elite plan is sold by the team and is not billed here); the tax treatment (Angolan IVA) is still to be decided.
 * Only the *limits* of products and landing pages are enforced by the platform; the other
 * advantages listed on the plan cards are not gated yet.
 */
export const PLAN_KEYS = ["starter", "pro"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export const PLANS = {
  // Landing pages are "per month" in the offer (3 / 10). The usage meter shows them; only the product limit is enforced.
  starter: { landingPages: 3, products: 50 },
  pro: { landingPages: 10, products: null },
} as const satisfies Record<PlanKey, { landingPages: number | null; products: number | null }>;

/** Whole Kwanzas per month. */
export const PLAN_PRICES: Record<PlanKey, number> = { starter: 4_999, pro: 11_999 };

/** Higher is bigger: an upgrade goes up this scale, a plan is never "downgraded" into while active. */
export const planRank = (plan: PlanKey) => PLAN_KEYS.indexOf(plan);
