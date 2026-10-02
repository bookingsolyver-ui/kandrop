import { z } from "zod";

/** Messages are stable CODES; the UI translates `Coupons.validation.<code>`. */
export type CouponValidationCode = "code_invalid" | "type_invalid" | "percent_invalid" | "amount_invalid" | "code_taken";

export const COUPON_TYPES = ["percent", "fixed"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const COUPON_CODE = /^[A-Z0-9_-]{3,32}$/;
const KZ = 100;
const MAX_FIXED_KZ = 10_000_000;

/** What the merchant types: the code (made upper case), the kind of discount and its value (percent, or whole Kwanzas). */
export const couponInputSchema = z
  .object({
    code: z.string().trim().toUpperCase().regex(COUPON_CODE, "code_invalid"),
    type: z.enum(COUPON_TYPES, "type_invalid"),
    /** A whole percent (1 to 99), or whole Kwanzas. */
    value: z.number("amount_invalid").int("amount_invalid").min(1, "amount_invalid"),
  })
  .superRefine((c, ctx) => {
    if (c.type === "percent" && c.value > 99) ctx.addIssue({ code: "custom", path: ["value"], message: "percent_invalid" });
    if (c.type === "fixed" && c.value > MAX_FIXED_KZ) ctx.addIssue({ code: "custom", path: ["value"], message: "amount_invalid" });
  });
export type CouponInput = z.input<typeof couponInputSchema>;

/** The value as it is stored: a percent stays a percent, Kwanzas become minor units. */
export const storedValue = (type: CouponType, value: number) => (type === "fixed" ? value * KZ : value);

export interface CouponRow {
  id: string;
  code: string;
  type: CouponType;
  /** Percent, or minor units (see `type`). */
  value: number;
  isActive: boolean;
  createdAt: number;
}
