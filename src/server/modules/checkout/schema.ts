import type { PlanKey } from "@/server/modules/plan/limits";

export interface CheckoutItem {
  /** Merchant catalogue name — user content, not a translatable UI string. */
  name: string;
  quantity: number;
  /** Minor units. */
  unitAmount: number;
}

/** Internal record. */
export interface CheckoutSession {
  id: string;
  storeId: string;
  storeName: string;
  /** Merchant tax number (NIF) at the time of purchase; `null` until the store provides one. */
  storeNif: string | null;
  currency: "AOA";
  items: CheckoutItem[];
  shippingAmount: number;
  /** Computed on the server from `items` + `shippingAmount` — never taken from the client. */
  total: number;
  paid: boolean;
  /** The store product being bought (a storefront "Buy now"), so a paid session can become an order. */
  productId?: string;
  /** Who buys and where it goes, taken on the product page. Personal data: never logged. */
  buyer?: { customer: { name: string; phone: string }; address: { street: string; city: string; province: string; reference?: string } };
  /**
   * Set when this session is a store paying for its Kandrop plan (the money is Kandrop's, not
   * the store's): once paid, `billing/activation` switches that store's plan on.
   */
  subscription?: { storeId: string; plan: PlanKey };
  createdAt: number;
  expiresAt: number;
}

/** What the buyer's browser may see: no store id, no internals. */
export interface PublicCheckout {
  id: string;
  storeName: string;
  currency: "AOA";
  items: CheckoutItem[];
  shippingAmount: number;
  subtotal: number;
  total: number;
  status: "open" | "paid" | "expired";
  expiresAt: string;
}
