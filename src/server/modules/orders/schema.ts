import type { PaymentMethod } from "@/shared/checkout/schemas";
import type { OrderStatus } from "@/shared/orders/schemas";

/**
 * Personal data (customer name, phone, address) and merchant content (product names).
 * Never translated, never logged.
 */
export interface OrderItem {
  name: string;
  quantity: number;
  /** Minor units. */
  unitAmount: number;
}

export interface OrderCustomer {
  name: string;
  /** National number, 9 digits (`+244` is implied). */
  phone: string;
  email?: string;
}

export interface OrderAddress {
  street: string;
  city: string;
  province: string;
  /** Bairro or município used to match the order to a courier (Talatona, Viana, Benguela…). */
  zone?: string;
  /** A landmark ("next to…"): how most deliveries in Angola are actually found. */
  reference?: string;
}

/** Internal record. Always scoped to a store. */
export interface OrderRecord {
  id: string;
  storeId: string;
  /** Sequential, human-facing number (#1042). */
  number: number;
  status: OrderStatus;
  customer: OrderCustomer;
  address: OrderAddress;
  items: OrderItem[];
  shippingAmount: number;
  /** items + shipping, computed on the server. */
  total: number;
  currency: "AOA";
  payment: { method: PaymentMethod; reference: string; paidAt: number };
  trackingCode?: string;
  /** Every status the order has been in, oldest first. */
  history: Array<{ status: OrderStatus; at: number }>;
  createdAt: number;
  updatedAt: number;
}

export interface PublicOrder {
  id: string;
  number: number;
  status: OrderStatus;
  customer: OrderCustomer;
  address: OrderAddress;
  items: OrderItem[];
  subtotal: number;
  shippingAmount: number;
  total: number;
  currency: "AOA";
  payment: { method: PaymentMethod; reference: string; paidAt: string };
  trackingCode?: string;
  history: Array<{ status: OrderStatus; at: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface OrderPage {
  items: PublicOrder[];
  /** Orders matching the search and the selected status. */
  total: number;
  /** Orders in the store, regardless of search or status. */
  overall: number;
  /** Per-status counts for the tabs, honouring the search but not the status filter. */
  counts: Record<OrderStatus | "all", number>;
  page: number;
  pageSize: number;
}
