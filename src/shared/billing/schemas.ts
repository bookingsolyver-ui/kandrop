import { z } from "zod";
import { PLAN_KEYS, type PlanKey } from "@/server/modules/plan/limits";

/** A paid plan lasts this many days from the payment. There is no automatic renewal yet. */
export const PERIOD_DAYS = 30;

/** Every plan is a paid one (there is no free tier). */
export const PAID_PLANS = PLAN_KEYS;
export type PaidPlan = PlanKey;

export const upgradeSchema = z.object({
  plan: z.enum(PAID_PLANS, { error: "plan_invalid" }),
});
export type UpgradeInput = z.input<typeof upgradeSchema>;

/** What an invoice line can be: the payment went through, is waiting for the payer, or did not. */
export type InvoiceStatus = "paid" | "pending" | "failed";
