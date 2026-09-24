import { z } from "zod";

/** Money is always integer minor units (cêntimos) + ISO 4217 code. Never floats. */
export const moneySchema = z.object({
  amount: z.number().int(),
  currency: z.literal("AOA"),
});

export const dashboardSummarySchema = z.object({
  volumeToday: moneySchema,
  transactionsToday: z.number().int().nonnegative(),
  successRate: z.number().min(0).max(1),
  pendingSettlement: moneySchema,
  updatedAt: z.iso.datetime(),
});

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
