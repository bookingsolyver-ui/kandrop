import { z } from "zod";

/** Messages are stable CODES; the UI translates `Payouts.validation.<code>`. */
export type PayoutValidationCode = "amount_required" | "amount_too_low" | "amount_too_high";

export const PAYOUT_STATUSES = ["pending", "completed"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

const KZ = 100;
/** Smallest transfer worth making (5 000 Kz), in minor units. */
export const MIN_PAYOUT = 5_000 * KZ;
/** Highest single request accepted (10 000 000 Kz). Matches the platform's price ceiling. */
export const MAX_PAYOUT = 10_000_000 * KZ;

const c = (code: PayoutValidationCode) => ({ error: code });

export const createPayoutSchema = z.object({
  /** Minor units. */
  amount: z
    .number(c("amount_required"))
    .int(c("amount_required"))
    .min(MIN_PAYOUT, c("amount_too_low"))
    .max(MAX_PAYOUT, c("amount_too_high")),
});
export type CreatePayoutInput = z.input<typeof createPayoutSchema>;

export const listPayoutsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
export type ListPayoutsQuery = z.input<typeof listPayoutsQuerySchema>;

export function firstPayoutError(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>
): Record<string, PayoutValidationCode> {
  const out: Record<string, PayoutValidationCode> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !(field in out)) out[field] = issue.message as PayoutValidationCode;
  }
  return out;
}
