import type { LogisticsStatus } from "@/shared/fulfilment/schemas";

/**
 * What the supplier sees of an order: what to prepare and what it is owed (its own cost price). Never the
 * shopper, the store's sale price or the merchant's margin.
 */
export interface SupplierOrderRow {
  id: string;
  orderNumber: number;
  productTitle: string;
  quantity: number;
  /** Minor units: cost price × quantity = what Kandrop owes the supplier. */
  costTotal: number;
  status: LogisticsStatus;
  createdAt: number;
  /** The supplier's remittance note, e.g. `NR 2026/000001`. */
  invoiceNumber: string | null;
}
