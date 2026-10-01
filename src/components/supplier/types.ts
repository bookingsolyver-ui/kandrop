import type { LogisticsStatus } from "@/shared/fulfilment/schemas";
import type { OrderPaymentStatus } from "@/shared/payments/orderPayment";

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
  /** Kandrop collects the money: the supplier's share is released only when this is `paid_verified` AND the parcel is delivered. */
  paymentStatus: OrderPaymentStatus;
  createdAt: number;
  /** The supplier's remittance note, e.g. `NR 2026/000001`. */
  invoiceNumber: string | null;
}
