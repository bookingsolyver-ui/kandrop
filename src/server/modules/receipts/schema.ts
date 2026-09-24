import type { PaymentMethod } from "@/shared/checkout/schemas";

export interface ReceiptItem {
  /** Merchant catalogue name: user content, not a translatable string. */
  name: string;
  quantity: number;
  /** Minor units. */
  unitAmount: number;
}

/**
 * A receipt is a *snapshot*: everything on it is copied at the moment the payment is confirmed,
 * so it never changes afterwards — not if the merchant renames the store or edits a product.
 */
export interface Receipt {
  /** Sequential, human-readable: `KD-2026-000123`. Also what the buyer quotes to the merchant. */
  number: string;
  paymentId: string;
  /** `subscription`: a store paying for its Kandrop plan (no shipping, no shop items). */
  kind?: "sale" | "subscription";
  issuedAt: number;
  merchant: { name: string; nif: string | null };
  transaction: {
    /** The provider's transaction id when there is one (`MCX-…`), otherwise our reference. */
    id: string;
    /** Our own reference (`KD-…`), the same the buyer saw while paying. */
    reference: string;
    method: PaymentMethod;
    /** Masked only (`+244 9•• ••• 789` / `visa •••• 4242`). */
    target: string;
    paidAt: number;
  };
  items: ReceiptItem[];
  subtotal: number;
  shippingAmount: number;
  total: number;
  currency: "AOA";
}

/** What the page receives: timestamps as ISO strings. */
export type PublicReceipt = Omit<Receipt, "issuedAt" | "transaction"> & {
  issuedAt: string;
  transaction: Omit<Receipt["transaction"], "paidAt"> & { paidAt: string };
};
