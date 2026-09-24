import { z } from "zod";

/** Money is always integer minor units (cêntimos) + ISO 4217 code. Never floats. */
export const moneySchema = z.object({
  amount: z.number().int(),
  currency: z.literal("AOA"),
});
export type Money = z.infer<typeof moneySchema>;

export const revenuePointSchema = z.object({
  /** UTC calendar day, `YYYY-MM-DD`. */
  date: z.iso.date(),
  /** Gross sales, minor units. */
  gross: z.number().int(),
  /** Gross minus supplier cost and fees, minor units. */
  net: z.number().int(),
});

export const topProductSchema = z.object({
  id: z.string(),
  /** Merchant catalogue name — user content, not a translatable UI string. */
  name: z.string(),
  unitsSold: z.number().int().nonnegative(),
  /** Gross revenue, minor units. */
  revenue: z.number().int(),
  /** Net / gross, 0..1. */
  marginRate: z.number().min(0).max(1),
});

export const dashboardSummarySchema = z.object({
  /** Window used by the KPIs and the chart. */
  periodDays: z.number().int().positive(),
  grossRevenue: z.object({
    value: moneySchema,
    /** Percentage change vs. the previous period (e.g. 8.4 = +8.4%). */
    changePct: z.number(),
  }),
  netRevenue: z.object({
    value: moneySchema,
    changePct: z.number(),
    /** net / gross, 0..1. */
    marginRate: z.number().min(0).max(1),
  }),
  pendingOrders: z.object({
    count: z.number().int().nonnegative(),
    /** Gross value of the orders still to be fulfilled. */
    value: moneySchema,
  }),
  availableBalance: z.object({
    value: moneySchema,
    /** Net profit locked in pending orders; released after delivery. */
    releasing: moneySchema,
  }),
  revenueSeries: z.array(revenuePointSchema),
  topProducts: z.array(topProductSchema),
  updatedAt: z.iso.datetime(),
});

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
export type RevenuePoint = z.infer<typeof revenuePointSchema>;
export type TopProduct = z.infer<typeof topProductSchema>;
