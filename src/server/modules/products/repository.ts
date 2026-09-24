import { randomBytes } from "node:crypto";
import type { ProductCategory, ProductStatus } from "@/shared/products/schemas";
import type { ProductRecord } from "./schema";

/**
 * STUB — in-memory, per process, lost on restart. Replace with a `products` table (index on
 * `store_id`) and an object store for images; the functions below are the whole contract.
 * Every call takes the `storeId` so tenant scoping cannot be forgotten by a caller.
 */
const g = globalThis as unknown as {
  __kandropProducts?: { stores: Map<string, Map<string, ProductRecord>>; seeded: Set<string> };
};
const db = (g.__kandropProducts ??= { stores: new Map(), seeded: new Set() });
/** slug → where the product lives. The public page has no session, so it looks up by slug. */
const slugs = ((
  g as { __kandropSlugs?: Map<string, { storeId: string; id: string }> }
).__kandropSlugs ??= new Map<string, { storeId: string; id: string }>());

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

/** A slug nobody has. Merchants' products get a random tail so two "Smartwatch" never clash. */
function uniqueSlug(title: string, plain: boolean): string {
  const base = slugify(title);
  if (plain && !slugs.has(base)) return base;
  for (;;) {
    const candidate = `${base}-${randomBytes(3).toString("hex")}`;
    if (!slugs.has(candidate)) return candidate;
  }
}

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

function seed(storeId: string, rows: Map<string, ProductRecord>) {
  const now = Date.now();
  DEMO_PRODUCTS.forEach(([title, category, status, cost, sale], i) => {
    const at = now - i * 3 * DAY;
    const id = newProductId();
    const [stock, regular, minutes] = DEMO_OFFERS[i] ?? [null, null, null];
    const slug = uniqueSlug(title, true);
    slugs.set(slug, { storeId, id });
    rows.set(id, {
      id,
      storeId,
      title,
      description: "",
      category,
      status,
      costPrice: cost * KZ,
      salePrice: sale * KZ,
      images: [],
      slug,
      stock,
      compareAtPrice: regular === null ? null : regular * KZ,
      offerEndsAt: minutes === null ? null : now + minutes * 60_000 - 1_000,
      views: 0,
      createdAt: at - 20 * DAY,
      updatedAt: at,
    });
  });
}

function rowsOf(storeId: string): Map<string, ProductRecord> {
  let rows = db.stores.get(storeId);
  if (!rows) db.stores.set(storeId, (rows = new Map()));
  if (storeId === "sto_demo" && !db.seeded.has(storeId)) {
    db.seeded.add(storeId);
    seed(storeId, rows);
  }
  return rows;
}

export const productRepository = {
  all: (storeId: string) => [...rowsOf(storeId).values()],
  get: (storeId: string, id: string) => rowsOf(storeId).get(id) ?? null,
  save(product: ProductRecord) {
    rowsOf(product.storeId).set(product.id, product);
    if (!product.slug) product.slug = uniqueSlug(product.title, false);
    slugs.set(product.slug, { storeId: product.storeId, id: product.id });
    return product;
  },
  delete(storeId: string, id: string) {
    const product = rowsOf(storeId).get(id);
    if (product) slugs.delete(product.slug);
    return rowsOf(storeId).delete(id);
  },
  /** For the public page: any store's product by its slug (`null` when there is none). */
  bySlug(slug: string): ProductRecord | null {
    rowsOf("sto_demo"); // the sandbox catalogue is seeded lazily
    const at = slugs.get(slug);
    return (at && rowsOf(at.storeId).get(at.id)) || null;
  },
};
