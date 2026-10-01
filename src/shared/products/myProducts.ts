import type { ProductStatus } from "./schemas";

/**
 * One row of the merchant's product table ("Os meus produtos"). Plain, serialisable and fully typed: every field is
 * always present (no `undefined` to trip over); money is in minor units.
 */
export interface MyProductRow {
  id: string;
  /** The public page is `/<locale>/loja/<slug>`. Never empty. */
  slug: string;
  title: string;
  status: ProductStatus;
  /** Units on hand, or `null` when the product does not track stock. */
  stock: number | null;
  costPrice: number;
  salePrice: number;
  /** What the platform suggests selling it for (the same rule as the Vitrine). */
  suggestedPrice: number;
  /** Units sold in the last 30 days (orders that carry the product id; cancelled ones do not count). */
  salesMonth: number;
  views: number;
  /** `supplier`: imported from a supplier's catalogue; `own`: created by the merchant. */
  origin: "supplier" | "own";
  /** URL of the cover image, or `null`. */
  cover: string | null;
}

/** Only an ACTIVE product has a public page (a draft or archived one answers 404). */
export const hasPublicPage = (p: Pick<MyProductRow, "status" | "slug">) => p.status === "active" && p.slug.length > 0;

/** The public page's path, without the origin: what the merchant shares. */
export const publicPath = (locale: string, slug: string) => `/${locale}/loja/${encodeURIComponent(slug)}`;

/** The direct checkout's path (`/<locale>/checkout/<slug>`). */
export const checkoutPath = (locale: string, slug: string) => `/${locale}/checkout/${encodeURIComponent(slug)}`;

/** The two links a merchant shares for an ACTIVE product, absolute and built on the public address. */
export interface PromoteLinks {
  /** The direct checkout (`/<locale>/checkout/<slug>`): the shopper lands on the form, ready to buy. */
  checkout: string;
  /** The product's sales page (`/<locale>/loja/<slug>`). */
  landing: string;
}

/** `origin` has no trailing slash (`https://www.kandrop.com`). */
export const promoteLinks = (origin: string, locale: string, slug: string): PromoteLinks => ({
  checkout: `${origin.replace(/\/+$/, "")}${checkoutPath(locale, slug)}`,
  landing: `${origin.replace(/\/+$/, "")}${publicPath(locale, slug)}`,
});
