/** What the operator console shows, all of it read from the database. Plain and serialisable; money in minor units. */

export type MerchantStatus = "active" | "suspended" | "pending_verification";

export interface MerchantRow {
  /** The store id (`/admin/lojistas/<id>`). */
  id: string;
  store: string;
  owner: string;
  email: string;
  /** Where the store operates (its profile), or `null` until the owner fills it in. */
  province: string | null;
  municipality: string | null;
  plan: "starter" | "pro";
  /** `suspended`: banned by the team; `pending_verification`: no active paid period yet. */
  status: MerchantStatus;
  joinedAt: number;
  /** The merchant's net of delivered, payment-verified orders. */
  balance: number;
  /** The merchant's net of verified orders still on their way. */
  held: number;
  pendingOrders: number;
  totalOrders: number;
  /** Gross merchandise value: verified, non-cancelled orders. */
  gmv: number;
}

export interface MerchantDetail extends MerchantRow {
  orders: Array<{ id: string; number: number; product: string; total: number; status: "pending" | "processing" | "shipped" | "delivered" | "cancelled" }>;
  products: Array<{ id: string; name: string; costPrice: number; supplierName: string }>;
  payouts: Array<{ id: string; date: number; amount: number; status: "paid" | "pending" | "rejected"; bank: string }>;
}

export interface CatalogRow {
  id: string;
  name: string;
  supplierName: string;
  category: string;
  costPrice: number;
  stock: number;
  status: "in_review" | "approved" | "rejected";
  /** How many stores sell it (imports). */
  stores: number;
  /** Units sold in the last 28 days, per week. */
  weeklySales: number;
}

export type LedgerKind = "payment_in" | "fee_retained" | "supplier_payment" | "payout_paid" | "payout_request";
export interface LedgerEntry {
  id: string;
  at: number;
  kind: LedgerKind;
  /** Signed: money in is positive, money out is negative. */
  amount: number;
  /** Who it concerns: the store, or the supplier for a withdrawal. */
  party: string;
  reference: string;
  note?: string;
}

export interface CashFlow {
  totals: { gmv: number; revenue: number; held: number; inTransit: number; stores: number };
  series: Array<{ date: string; gmv: number; revenue: number }>;
  ledger: LedgerEntry[];
}

export interface ReconRow {
  id: string;
  number: number;
  storeId: string;
  store: string;
  at: number;
  total: number;
  productCost: number;
  commission: number;
  merchantNet: number;
  /** `available`: delivered, so the money is released; `pending`: paid but not delivered yet. */
  status: "pending" | "available";
}
