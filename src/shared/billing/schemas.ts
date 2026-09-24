import { z } from "zod";

/** A paid plan lasts this many days from the payment. There is no automatic renewal yet. */
export const PERIOD_DAYS = 30;

export const PAID_PLANS = ["growth", "scale"] as const;
export type PaidPlan = (typeof PAID_PLANS)[number];

export const upgradeSchema = z.object({
  plan: z.enum(PAID_PLANS, { error: "plan_invalid" }),
});
export type UpgradeInput = z.input<typeof upgradeSchema>;

/** What an invoice line can be: the payment went through, is waiting for the payer, or did not. */
export type InvoiceStatus = "paid" | "pending" | "failed";
