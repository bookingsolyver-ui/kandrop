import { createHash, randomBytes } from "node:crypto";
import type { ProductCategory, ProductStatus } from "@/shared/products/schemas";
import { isDemoStore } from "@/server/modules/store/demo";
import { db, isUniqueViolation, must, rows } from "@/server/db/client";
import type { LoadedImage, ProductRecord } from "./schema";

export const KZ = 100;
const DAY = 24 * 60 * 60 * 1000;

export const newProductId = () => `prd_${randomBytes(9).toString("base64url")}`;
/** `Café moído do Amboim 500 g` → `cafe-moido-do-amboim-500-g` (no accents, at most 60 chars). */
export function slugify(title: string): string {
  const base = title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return base || "produto";
}

/** A candidate slug for a merchant's product: a random tail so two "Smartwatch" never clash. */
const randomSlug = (title: string) => `${slugify(title)}-${randomBytes(3).toString("hex")}`;

export const newImageId = () => `img_${randomBytes(9).toString("base64url")}`;

/** [title, category, status, cost Kz, sale Kz] — demo catalogue for the sandbox store only. */
export const DEMO_PRODUCTS: Array<[string, ProductCategory, ProductStatus, number, number]> = [
  ["Smartwatch Série X", "electronics", "active", 21_000, 32_000],
  ["Auriculares sem fios Pro", "electronics", "active", 11_500, 18_500],
  ["Carregador rápido 65 W", "electronics", "active", 4_200, 7_500],
  ["Coluna Bluetooth Mini", "electronics", "draft", 6_800, 9_900],
  ["Vestido de algodão estampado", "fashion", "active", 8_500, 15_000],
  ["Ténis urbanos unissexo", "fashion", "active", 14_000, 22_500],
  ["Mochila impermeável 25 L", "fashion", "archived", 9_000, 12_500],
  ["Conjunto de lençóis King", "home", "active", 12_000, 21_000],
  ["Candeeiro de mesa em bambu", "home", "draft", 5_500, 8_900],
  ["Organizador de cozinha", "home", "active", 3_100, 5_200],
  ["Sérum facial vitamina C", "beauty", "active", 6_200, 11_800],
  ["Creme hidratante corporal", "beauty", "active", 3_900, 6_400],
  ["Café moído do Amboim 500 g", "food", "active", 2_800, 4_600],
  ["Mel puro do Huambo 1 kg", "food", "archived", 4_000, 6_000],
];

/**
 * SANDBOX offers for the first demo products: [stock, regular price Kz, offer minutes left].
 * The deadline is real: when it passes, the page charges the regular price.
 */
const DEMO_OFFERS: Array<[number | null, number | null, number | null]> = [
  [3, 45_000, 15],
  [12, 24_000, null],
  [40, null, null],
];

const toRow = (p: ProductRecord) => ({
  id: p.id,
  store_id: p.storeId,
  title: p.title,
  description: p.description,
  category: p.category,
  status: p.status,
  cost_price: p.costPrice,
  sale_price: p.salePrice,
  images: p.images.map((image) => ({ id: image.id, mime: image.mime })),
  slug: p.slug,
  stock: p.stock,
  compare_at_price: p.compareAtPrice,
  offer_ends_at: p.offerEndsAt,
  views: p.views,
  created_at: p.createdAt,
  updated_at: p.updatedAt,
});

function fromRow(row: Record<string, unknown>): ProductRecord {
  return {
    id: String(row.id),
    storeId: String(row.store_id),
    title: String(row.title),
    description: String(row.description ?? ""),
    category: row.category as ProductCategory,
    status: row.status as ProductStatus,
    costPrice: Number(row.cost_price),
    salePrice: Number(row.sale_price),
    images: (row.images as ProductRecord["images"]) ?? [],
    slug: String(row.slug),
    stock: row.stock === null ? null : Number(row.stock),
    compareAtPrice: row.compare_at_price === null ? null : Number(row.compare_at_price),
    offerEndsAt: row.offer_ends_at === null ? null : Number(row.offer_ends_at),
    views: Number(row.views ?? 0),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

const DEMO_STORE = "sto_demo";
const DEMO_SLUGS = new Set(DEMO_PRODUCTS.map(([title]) => slugify(title)));

/** Public slugs are unique across stores: the sandbox store keeps the plain ones, others get a tail. */
const demoSlug = (storeId: string, title: string) =>
  storeId === DEMO_STORE
    ? slugify(title)
    : `${slugify(title)}-${createHash("sha1").update(storeId).digest("hex").slice(0, 6)}`;

/** The demo catalogue: created the first time a demo store is looked at. */
async function seedDemo(storeId: string) {
  if (!(await isDemoStore(storeId))) return;
  const { count, error } = await db()
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId);
  if (error || count !== 0) return;

  const now = Date.now();
  const rows = DEMO_PRODUCTS.map(([title, category, status, cost, sale], i) => {
    const at = now - i * 3 * DAY;
    const [stock, regular, minutes] = DEMO_OFFERS[i] ?? [null, null, null];
    return toRow({
      id: newProductId(),
      storeId,
      title,
      description: "",
      category,
      status,
      costPrice: cost * KZ,
      salePrice: sale * KZ,
      images: [],
      slug: demoSlug(storeId, title),
      stock,
      compareAtPrice: regular === null ? null : regular * KZ,
      offerEndsAt: minutes === null ? null : now + minutes * 60_000 - 1_000,
      views: 0,
      createdAt: at - 20 * DAY,
      updatedAt: at,
    });
  });
  must(
    "products.seed",
    await db().from("products").upsert(rows, { onConflict: "slug", ignoreDuplicates: true })
  );
}

/** Every call takes the `storeId` so tenant scoping cannot be forgotten by a caller. */
export const productRepository = {
  async all(storeId: string): Promise<ProductRecord[]> {
    await seedDemo(storeId);
    const data = rows(
      "products.all",
      await db().from("products").select("*").eq("store_id", storeId)
    );
    return data.map(fromRow);
  },

  async get(storeId: string, id: string): Promise<ProductRecord | null> {
    await seedDemo(storeId);
    const data = must(
      "products.get",
      await db().from("products").select("*").eq("store_id", storeId).eq("id", id).maybeSingle()
    );
    return data ? fromRow(data) : null;
  },

  /**
   * Creates or updates a product. A product without a slug gets one (a random tail keeps two
   * "Smartwatch" apart; a clash is retried). Images that carry bytes are stored; images no longer
   * listed are removed.
   */
  async save(product: ProductRecord): Promise<ProductRecord> {
    const assign = !product.slug;
    for (let attempt = 0; ; attempt++) {
      if (assign) product.slug = randomSlug(product.title);
      const { error } = await db().from("products").upsert(toRow(product));
      if (!error) break;
      if (!(assign && isUniqueViolation(error) && attempt < 5)) {
        must("products.save", { data: null, error });
      }
    }

    const fresh = product.images.filter((image) => image.data);
    if (fresh.length > 0) {
      must(
        "product_images.save",
        await db()
          .from("product_images")
          .upsert(
            fresh.map((image) => ({
              id: image.id,
              product_id: product.id,
              store_id: product.storeId,
              mime: image.mime,
              data: image.data!.toString("base64"),
            }))
          )
      );
    }
    const keep = product.images.map((image) => image.id);
    const stale = db().from("product_images").delete().eq("product_id", product.id);
    must(
      "product_images.prune",
      await (keep.length > 0 ? stale.not("id", "in", `(${keep.join(",")})`) : stale)
    );
    return product;
  },

  async delete(storeId: string, id: string): Promise<boolean> {
    const data = rows(
      "products.delete",
      await db().from("products").delete().eq("store_id", storeId).eq("id", id).select("id")
    );
    return data.length > 0; // its images go with it (on delete cascade)
  },

  /** For the public page: any store's product by its slug (`null` when there is none). */
  async bySlug(slug: string): Promise<ProductRecord | null> {
    const find = async () =>
      must("products.bySlug", await db().from("products").select("*").eq("slug", slug).maybeSingle());
    let row = await find();
    if (!row && DEMO_SLUGS.has(slug)) {
      await seedDemo(DEMO_STORE);
      row = await find();
    }
    return row ? fromRow(row) : null;
  },

  /** One image with its bytes, of a product of this store. */
  async image(storeId: string, productId: string, imageId: string): Promise<LoadedImage | null> {
    const row = must(
      "product_images.get",
      await db()
        .from("product_images")
        .select("id, mime, data")
        .eq("store_id", storeId)
        .eq("product_id", productId)
        .eq("id", imageId)
        .maybeSingle()
    );
    return row ? { id: row.id, mime: row.mime, data: Buffer.from(row.data, "base64") } : null;
  },

  /** Counts a page view of an active product (atomic, in the database). */
  /**
   * Takes `qty` units in ONE atomic statement (`reserve_stock`, see the security migration), so two
   * simultaneous sales of the last unit cannot both win. Returns the remaining stock, or `null` when
   * there is not enough. Unlimited stock (`stock` null) always succeeds. Call it right where a sale
   * becomes real, and `releaseStock` if that sale is undone.
   */
  async reserveStock(productId: string, qty: number): Promise<number | null> {
    const remaining = must("reserve stock", await db().rpc("reserve_stock", { p_product_id: productId, p_qty: qty }));
    return remaining === null ? null : Number(remaining);
  },

  async releaseStock(productId: string, qty: number): Promise<void> {
    must("release stock", await db().rpc("release_stock", { p_product_id: productId, p_qty: qty }));
  },

  async recordView(slug: string): Promise<void> {
    must("products.view", await db().rpc("increment_product_views", { product_slug: slug }));
  },
};
