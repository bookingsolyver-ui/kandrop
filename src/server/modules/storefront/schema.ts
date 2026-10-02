import type { DeliveryCity } from "@/shared/fulfilment/schemas";
import type { ShippingBearer, StockState } from "@/shared/products/schemas";

/** What a shopper's browser may know about a product: nothing about costs, margins or the store id. */
export interface StorefrontProduct {
  slug: string;
  title: string;
  description: string;
  storeName: string;
  currency: "AOA";
  images: Array<{ id: string; url: string }>;
  /** What is charged now (minor units). */
  price: number;
  /** Struck-through regular price while the offer stands. */
  regularPrice: number | null;
  /** 0.29 = 29 % off, rounded; `null` without an offer. */
  discountRate: number | null;
  /** ISO end of the offer, `null` when it has no deadline (or there is no offer). */
  offerEndsAt: string | null;
  stock: {
    state: StockState;
    /** Only given when few are left: the exact stock of a well-stocked product is not public. */
    remaining?: number;
  };
  /** Who pays the delivery, and the fee per province the shopper pays when it is them (minor units). */
  shipping: { bearer: ShippingBearer; rates: Record<DeliveryCity, number> };
  /** The STORE's own support contacts (never the platform's), or nulls. */
  support: { whatsapp: string | null; email: string | null };
  /** The merchant's own Meta Pixel id (public by nature: it is in the page of any store that uses it), or `null`. */
  metaPixelId: string | null;
  /** The server's clock, so the countdown does not depend on the shopper's device clock. */
  now: string;
  /** Test mode: the page may show clearly-labelled example content (reviews). */
  sandbox: boolean;
}
