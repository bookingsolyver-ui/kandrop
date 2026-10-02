// No `server-only` here on purpose: these are plain, public constants (plan names, limits, prices) that the
// subscription screens also read in the browser. Nothing secret lives in this file.
/**
 * Plans: their limits and their price. Plain constants (no imports) so the plan service, the
 * billing module and every module that enforces a limit can read them without depending on
 * each other. `null` means unlimited.
 *
 * There is NO free plan: the dashboard is behind a payment gate (an account without an active
 * paid period is sent to `/checkout`). Starter (8.799 Kz) and Pro (18.999 Kz) a month are the
 * regular prices; the FIRST paid month of a store is the launch price (4.999 / 11.999 Kz, see
 * `PLAN_INTRO_PRICES`). The Elite plan is sold by the team and is not billed here; the tax treatment (Angolan IVA) is still to be decided.
 * Only the *limits* of products and landing pages are enforced by the platform; the other
 * advantages listed on the plan cards are not gated yet.
 */
export const PLAN_KEYS = ["starter", "pro"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export const PLANS = {
  // Landing pages are "per month" in the offer (Starter 5, Pro unlimited). The usage meter shows them; only the product limit is enforced.
  starter: { landingPages: 5, products: 50 },
  pro: { landingPages: null, products: null },
} as const satisfies Record<PlanKey, { landingPages: number | null; products: number | null }>;

/** Regular price, whole Kwanzas per month (from the 2nd paid month on). */
export const PLAN_PRICES: Record<PlanKey, number> = { starter: 8_799, pro: 18_999 };

/** Launch price of the first paid month of a store, whole Kwanzas. */
export const PLAN_INTRO_PRICES: Record<PlanKey, number> = { starter: 4_999, pro: 11_999 };

/** The discount of the first month over the regular price, in percent with one decimal (43.2 / 36.8). */
export const introDiscountPct = (plan: PlanKey) =>
  Math.round((1 - PLAN_INTRO_PRICES[plan] / PLAN_PRICES[plan]) * 1000) / 10;

/** Higher is bigger: an upgrade goes up this scale, a plan is never "downgraded" into while active. */
export const planRank = (plan: PlanKey) => PLAN_KEYS.indexOf(plan);
