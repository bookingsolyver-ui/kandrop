import type { StockState } from "@/shared/products/schemas";

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
  /** The server's clock, so the countdown does not depend on the shopper's device clock. */
  now: string;
  /** Test mode: the page may show clearly-labelled example content (reviews). */
  sandbox: boolean;
}
