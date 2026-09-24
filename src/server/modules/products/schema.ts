import type { Margin, ProductCategory, ProductStatus } from "@/shared/products/schemas";

export type ImageMime = "image/jpeg" | "image/png" | "image/webp";

export interface StoredImage {
  id: string;
  mime: ImageMime;
  data: Buffer;
}

/** Internal record. Always scoped to a store: a merchant can never reach another store's rows. */
export interface ProductRecord {
  id: string;
  storeId: string;
  /** Merchant content, not a translatable UI string. */
  title: string;
  description: string;
  category: ProductCategory;
  status: ProductStatus;
  /** Minor units. */
  costPrice: number;
  salePrice: number;
  images: StoredImage[];
  /** URL part of the public page, `/loja/<slug>`. Unique across stores, never changes. */
  slug: string;
  /** Units on hand, or `null` when not tracked. */
  stock: number | null;
  /** Regular price the offer is compared with (minor units), or `null` for no offer. */
  compareAtPrice: number | null;
  /** End of the offer price (epoch ms), or `null`. */
  offerEndsAt: number | null;
  /** Times the public page was opened (a simulated analytics counter). */
  views: number;
  createdAt: number;
  updatedAt: number;
}

export interface PublicProduct {
  id: string;
  title: string;
  description: string;
  category: ProductCategory;
  status: ProductStatus;
  costPrice: number;
  salePrice: number;
  currency: "AOA";
  /** Derived on the server from the two prices — never taken from the client. */
  margin: Margin;
  /** The first image is the cover. */
  images: Array<{ id: string; url: string }>;
  slug: string;
  stock: number | null;
  compareAtPrice: number | null;
  /** ISO time, or `null`. */
  offerEndsAt: string | null;
  views: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPage {
  items: PublicProduct[];
  /** Products matching the current search and filters. */
  total: number;
  /** Products in the store regardless of filters (tells "empty catalogue" from "no matches"). */
  overall: number;
  page: number;
  pageSize: number;
}
