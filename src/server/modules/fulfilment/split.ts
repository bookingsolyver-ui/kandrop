import { platformCommission } from "@/shared/products/schemas";

/** The money of one supplier order, fixed at the moment of the sale (minor units). */
export interface Split {
  saleTotal: number;
  costTotal: number;
  /** The merchant's gross margin: sale − the supplier's cost. */
  margin: number;
  commissionBps: number;
  /** Kandrop's share: a fixed percentage of the SALE value, taken first and always secured. */
  commission: number;
  /** A coupon's discount, paid entirely out of the merchant's margin (0 without one). */
  discount: number;
  /** Delivery paid by the merchant ("frete por sua conta"), out of their margin (0 when the customer pays it). */
  shipping: number;
  /** What the merchant keeps: margin − commission − discount − shipping (the freight comes off only after the commission). */
  merchantNet: number;
}

/**
 * THE commission rule, in one place. Kandrop takes `commissionBps` (7.9 %, `PLATFORM_COMMISSION_BPS`) of the SALE value;
 * the supplier is always owed its full cost price. Integer maths (minor units, rounded to the unit).
 */
export function splitSale(unitPrice: number, unitCost: number, quantity: number, commissionBps: number, discount = 0, shipping = 0): Split {
  const saleTotal = unitPrice * quantity;
  const costTotal = unitCost * quantity;
  const margin = saleTotal - costTotal;
  const commission = platformCommission(saleTotal, commissionBps);
  // The commission is ALWAYS on the original price; the discount only reduces what the merchant keeps.
  return { saleTotal, costTotal, margin, commissionBps, commission, discount, shipping, merchantNet: margin - commission - discount - shipping };
}

