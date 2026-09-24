import { z } from "zod";

/**
 * Product validation shared by the browser (instant feedback) and the API (the real gate).
 * Messages are stable CODES; the UI translates `Catalog.validation.<code>`.
 * Money is integer minor units (cêntimos), like everywhere else on the platform.
 */
export type ProductValidationCode =
  | "title_required"
  | "title_too_long"
  | "description_too_long"
  | "category_invalid"
  | "status_invalid"
  | "cost_required"
  | "cost_too_high"
  | "price_required"
  | "price_too_high"
  | "images_invalid"
  | "images_max"
  | "stock_invalid"
  | "compare_price_invalid"
  | "offer_end_invalid"
  | "offer_needs_price";

export const PRODUCT_CATEGORIES = [
  "fashion",
  "electronics",
  "home",
  "beauty",
  "food",
  "other",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_STATUSES = ["active", "draft", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_SORTS = ["updated", "title", "price", "margin"] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const MAX_IMAGES = 5;
export const MAX_STOCK = 1_000_000;
/** Length of the base64 data URL. Images are resized in the browser first, so this is generous. */
export const MAX_IMAGE_DATA_URL_CHARS = 700_000;
/** Highest price accepted, in minor units (10 000 000 Kz). Matches the checkout limit. */
export const MAX_PRICE = 1_000_000_000;
/** Bodies carry inline images, so they are larger than the rest of the API's. */
export const MAX_PRODUCT_BODY_BYTES = 4_000_000;

const c = (code: ProductValidationCode) => ({ error: code });

const imageRef = z.union(
  [
    /** An image the product already has (kept as is). */
    z.object({ id: z.string().regex(/^img_[A-Za-z0-9_-]{8,32}$/) }),
    /** A newly uploaded image. */
    z.object({
      dataUrl: z
        .string()
        .max(MAX_IMAGE_DATA_URL_CHARS)
        .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/),
    }),
  ],
  c("images_invalid")
);
export type ImageRef = z.infer<typeof imageRef>;

const fields = z.object({
  title: z
    .string(c("title_required"))
    .trim()
    .min(1, c("title_required"))
    .max(120, c("title_too_long")),
  description: z.string().trim().max(2000, c("description_too_long")),
  category: z.enum(PRODUCT_CATEGORIES, c("category_invalid")),
  status: z.enum(PRODUCT_STATUSES, c("status_invalid")),
  costPrice: z
    .number(c("cost_required"))
    .int(c("cost_required"))
    .min(0, c("cost_required"))
    .max(MAX_PRICE, c("cost_too_high")),
  salePrice: z
    .number(c("price_required"))
    .int(c("price_required"))
    .min(1, c("price_required"))
    .max(MAX_PRICE, c("price_too_high")),
  images: z.array(imageRef, c("images_invalid")).max(MAX_IMAGES, c("images_max")),
  /** Units on hand; `null` = not tracked (the storefront then never talks about stock). */
  stock: z
    .number(c("stock_invalid"))
    .int(c("stock_invalid"))
    .min(0, c("stock_invalid"))
    .max(MAX_STOCK, c("stock_invalid"))
    .nullable(),
  /** The regular price the offer is measured against (must be above the sale price). */
  compareAtPrice: z
    .number(c("compare_price_invalid"))
    .int(c("compare_price_invalid"))
    .min(1, c("compare_price_invalid"))
    .max(MAX_PRICE, c("compare_price_invalid"))
    .nullable(),
  /** When the offer price ends (epoch ms). After it the regular price applies. */
  offerEndsAt: z
    .number(c("offer_end_invalid"))
    .int(c("offer_end_invalid"))
    .min(0, c("offer_end_invalid"))
    .nullable(),
});

/** Creating: description, status and images are optional and fall back to sensible defaults. */
export const createProductSchema = fields.extend({
  description: fields.shape.description.default(""),
  status: fields.shape.status.default("active"),
  images: fields.shape.images.default([]),
  stock: fields.shape.stock.default(null),
  compareAtPrice: fields.shape.compareAtPrice.default(null),
  offerEndsAt: fields.shape.offerEndsAt.default(null),
});

/** Updating: any subset of fields. Built from `fields` (no defaults) so an omitted field is untouched. */
export const updateProductSchema = fields.partial();

export type CreateProductInput = z.input<typeof createProductSchema>;
export type UpdateProductInput = z.input<typeof updateProductSchema>;

export const listProductsQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.enum(PRODUCT_CATEGORIES).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  sort: z.enum(PRODUCT_SORTS).default("updated"),
  dir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
export type ListProductsQuery = z.input<typeof listProductsQuerySchema>;

/** First error code per field, for forms that show one message per input. */
export function firstProductError(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>
): Record<string, ProductValidationCode> {
  const out: Record<string, ProductValidationCode> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !(field in out)) out[field] = issue.message as ProductValidationCode;
  }
  return out;
}

// ── Margin ────────────────────────────────────────────────────────────────────────────────

export interface Margin {
  /** Sale price − cost, minor units. Negative when selling below cost. */
  amount: number;
  /** Margin over the sale price (0.38 = 38 %), or `null` when there is no sale price yet. */
  rate: number | null;
}

/** One definition for the form, the table and the API, so the three can never disagree. */
export function computeMargin(costPrice: number, salePrice: number): Margin {
  return {
    amount: salePrice - costPrice,
    rate: salePrice > 0 ? (salePrice - costPrice) / salePrice : null,
  };
}

// ── Offer and stock ───────────────────────────────────────────────────────────────────────

/**
 * Cross-field rules, shared by the form and the API. (Not a schema refinement: partial updates
 * only carry some fields, so the rule runs on the merged product.) `future` also requires the
 * deadline to be ahead of `now` — checked when the deadline is being set, not on every save.
 */
export function offerProblem(
  p: { salePrice: number; compareAtPrice: number | null; offerEndsAt: number | null },
  now: number,
  future: boolean
): { field: "compareAtPrice" | "offerEndsAt"; code: ProductValidationCode } | null {
  if (p.compareAtPrice !== null && p.compareAtPrice <= p.salePrice) {
    return { field: "compareAtPrice", code: "compare_price_invalid" };
  }
  if (p.offerEndsAt !== null && p.compareAtPrice === null) {
    return { field: "offerEndsAt", code: "offer_needs_price" };
  }
  if (p.offerEndsAt !== null && future && p.offerEndsAt <= now) {
    return { field: "offerEndsAt", code: "offer_end_invalid" };
  }
  return null;
}

export interface Offer {
  /** What the buyer pays now, minor units. */
  price: number;
  /** The struck-through regular price, while the offer stands; otherwise `null`. */
  regularPrice: number | null;
  /** When the offer price ends (epoch ms); `null` for an offer with no deadline or none at all. */
  endsAt: number | null;
}

/**
 * One definition of "the price right now", used by the page, the checkout and the API so they
 * cannot disagree. Once the deadline passes the offer is over: the regular price is charged and
 * nothing is struck through — the countdown is a promise the shop keeps.
 */
export function offerOf(
  p: { salePrice: number; compareAtPrice: number | null; offerEndsAt: number | null },
  now: number
): Offer {
  if (p.compareAtPrice === null) return { price: p.salePrice, regularPrice: null, endsAt: null };
  if (p.offerEndsAt === null) {
    return { price: p.salePrice, regularPrice: p.compareAtPrice, endsAt: null };
  }
  if (p.offerEndsAt > now) {
    return { price: p.salePrice, regularPrice: p.compareAtPrice, endsAt: p.offerEndsAt };
  }
  return { price: p.compareAtPrice, regularPrice: null, endsAt: null };
}

/** From this many units down the storefront says how few are left. */
export const LOW_STOCK = 5;

export type StockState = "untracked" | "in" | "low" | "out";
export const stockState = (stock: number | null): StockState =>
  stock === null ? "untracked" : stock === 0 ? "out" : stock <= LOW_STOCK ? "low" : "in";
