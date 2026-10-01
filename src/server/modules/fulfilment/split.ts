/** The money of one supplier order, fixed at the moment of the sale (minor units). */
export interface Split {
  saleTotal: number;
  costTotal: number;
  /** The merchant's gross margin: sale − the supplier's cost. */
  margin: number;
  commissionBps: number;
  /** Kandrop's share of the margin (never negative: a sale below cost earns no commission). */
  commission: number;
  /** What the merchant keeps: margin − commission. */
  merchantNet: number;
}

/**
 * THE commission rule, in one place. Kandrop takes `COMMISSION_BPS` of the merchant's gross margin;
 * the supplier is always owed its full cost price. Integer maths (minor units, rounded to the unit).
 */
export function splitSale(unitPrice: number, unitCost: number, quantity: number, commissionBps: number): Split {
  const saleTotal = unitPrice * quantity;
  const costTotal = unitCost * quantity;
  const margin = saleTotal - costTotal;
  const commission = margin > 0 ? Math.round((margin * commissionBps) / 10_000) : 0;
  return { saleTotal, costTotal, margin, commissionBps, commission, merchantNet: margin - commission };
}

