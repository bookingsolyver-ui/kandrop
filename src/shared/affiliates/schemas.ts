import { z } from "zod";

/**
 * !! PLACEHOLDER COMMERCIAL TERMS !! 20% recurring is the rate the brief asks for; there is no
 * signed commercial decision behind it yet. Confirm it (and how/when commissions are paid out)
 * before the programme is presented as real. In basis points so money maths stays in integers.
 */
export const COMMISSION_BPS = 2_000;

export const REFERRAL_PLANS = ["starter", "pro"] as const;
export type ReferralPlan = (typeof REFERRAL_PLANS)[number];

/** `pending` = signed up and chose a plan but has not paid yet (the payment gate holds them at checkout). */
export const PAYMENT_STATES = ["paid", "pending", "overdue"] as const;
export type PaymentState = (typeof PAYMENT_STATES)[number];

/** A month of commission on a plan that costs `priceMinor`, in minor units (integers only). */
export const commissionOf = (priceMinor: number) =>
  Math.round((priceMinor * COMMISSION_BPS) / 10_000);

/**
 * `joao.mendes@gmail.com` → `j***@gmail.com`. Done on the server, so the full address of a
 * referred person never reaches the browser. A very short name shows nothing of itself
 * (`***@…`): one letter would be the whole name.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "***";
  const local = email.slice(0, at);
  return `${local.length >= 3 ? local[0] : ""}***${email.slice(at)}`;
}

/** What the link's `?ref=` may contain: lower-case letters and digits (see `slugOf`). */
export const refCodeSchema = z.string().regex(/^[a-z0-9]{2,24}$/);

export const listReferralsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
export type ListReferralsQuery = z.input<typeof listReferralsQuerySchema>;
