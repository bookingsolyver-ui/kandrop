import "server-only";
import { splitSale } from "@/server/modules/fulfilment/split";
import type { CouponType } from "@/shared/coupons/schemas";

/** What a coupon takes off a subtotal (minor units): a whole percent (floored), or a fixed amount. */
export const discountFor = (type: CouponType, value: number, subtotal: number) =>
  type === "percent" ? Math.floor((subtotal * value) / 100) : value;

export type CouponEvaluation = { ok: false } | { ok: true; discount: number; total: number; merchantNet: number };

/**
 * THE GOLDEN RULE, in one place. The discount comes out of the MERCHANT's margin and nothing else:
 *  - the supplier is owed its full cost price;
 *  - Kandrop's commission is worked out on the ORIGINAL price (the coupon is ignored for it);
 *  - the merchant keeps  (what the customer pays) − (supplier cost) − (commission).
 * Anti-loss lock: when that would be negative (the discount does not even cover the supplier and the platform) or the
 * discount would take the whole price, the coupon is NOT applicable (`ok: false`) and the order is never created.
 * Integer maths in minor units; the same function backs the live preview and the saved order.
 */
export function evaluateCoupon(input: { type: CouponType; value: number; unitPrice: number; unitCost: number; quantity: number; shipping: number; commissionBps: number }): CouponEvaluation {
  const subtotal = input.unitPrice * input.quantity;
  const discount = discountFor(input.type, input.value, subtotal);
  if (!Number.isInteger(discount) || discount <= 0 || discount >= subtotal) return { ok: false };
  const split = splitSale(input.unitPrice, input.unitCost, input.quantity, input.commissionBps); // original price, no coupon
  const merchantNet = split.merchantNet - discount; // = paid − supplier cost − commission
  if (merchantNet < 0) return { ok: false };
  return { ok: true, discount, total: subtotal - discount + input.shipping, merchantNet };
}
