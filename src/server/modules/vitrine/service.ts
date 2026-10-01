import { db, isUniqueViolation, must } from "@/server/db/client";
import { ApiError } from "@/server/http/errors";
import { createProduct } from "@/server/modules/products/service";
import { newImageId, productRepository } from "@/server/modules/products/repository";
import { suggestedSalePrice } from "@/shared/vitrine/catalog";
import type { Session } from "@/server/auth/types";
import type { ProductCategory } from "@/shared/products/schemas";
import type { ImageMime } from "@/server/modules/products/schema";

/** What a merchant sees of an APPROVED supplier product (the cost price included: it is their margin). */
export interface CatalogProduct {
  id: string;
  supplierId: string;
  supplierName: string;
  name: string;
  description: string;
  category: string;
  /** Minor units: what the supplier charges the merchant. */
  costPrice: number;
  stock: number;
  hasImage: boolean;
  createdAt: number;
  updatedAt: number;
}

const COLUMNS = "id,supplier_id,name,description,category,cost_price,stock,image_mime,created_at,updated_at,suppliers!inner(company_name,status)";

function fromRow(row: Record<string, unknown>): CatalogProduct {
  const supplier = row.suppliers as { company_name?: string } | null;
  return {
    id: String(row.id),
    supplierId: String(row.supplier_id),
    supplierName: String(supplier?.company_name ?? "—"),
    name: String(row.name),
    description: String(row.description ?? ""),
    category: String(row.category),
    costPrice: Number(row.cost_price),
    stock: Number(row.stock),
    hasImage: row.image_mime != null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

/**
 * The Vitrine: ONLY products whose status is `approved` AND whose supplier is `approved` too (a rejected
 * supplier's catalogue disappears at once). In review and rejected products never reach a merchant.
 */
export async function listApprovedCatalog(supplierId?: string): Promise<CatalogProduct[]> {
  let q = db()
    .from("supplier_products")
    .select(COLUMNS)
    .eq("status", "approved")
    .eq("suppliers.status", "approved")
    .order("created_at", { ascending: false })
    .limit(500);
  if (supplierId) q = q.eq("supplier_id", supplierId);
  return (must("vitrine.list", await q) ?? []).map(fromRow);
}

export async function getApprovedProduct(id: string): Promise<CatalogProduct | null> {
  const row = must(
    "vitrine.get",
    await db().from("supplier_products").select(COLUMNS).eq("id", id).eq("status", "approved").eq("suppliers.status", "approved").maybeSingle()
  );
  return row ? fromRow(row) : null;
}

export async function approvedImage(id: string): Promise<{ mime: ImageMime; data: Buffer } | null> {
  const row = must(
    "vitrine.image",
    await db().from("supplier_products").select("image_mime,image_data,suppliers!inner(status)").eq("id", id).eq("status", "approved").eq("suppliers.status", "approved").maybeSingle()
  );
  if (!row || !row.image_data || !row.image_mime) return null;
  return { mime: row.image_mime as ImageMime, data: Buffer.from(String(row.image_data), "base64") };
}

/** The supplier products this store already imported (by supplier product id). */
export async function importedIds(storeId: string): Promise<string[]> {
  const rows = must("vitrine.imports", await db().from("supplier_imports").select("supplier_product_id").eq("store_id", storeId));
  return (rows ?? []).map((r) => String(r.supplier_product_id));
}

/** Vitrine categories → the store catalogue's own. */
const CATEGORY: Record<string, ProductCategory> = {
  beauty: "beauty", fashion: "fashion", home: "home", tech: "electronics",
  jewelry: "fashion", toys: "other", health: "beauty", pets: "other",
};

/**
 * Adds an approved supplier product to the merchant's own store as a DRAFT product (cost price = the
 * supplier's price, sale price = a suggestion, the photo copied). The (store, product) pair is claimed
 * first, so two clicks, or two tabs, cannot create it twice; if creating the product fails, the claim
 * is released.
 */
export async function importSupplierProduct(auth: Session, supplierProductId: string): Promise<{ productId: string }> {
  const source = await getApprovedProduct(supplierProductId);
  if (!source) throw new ApiError("not_found");

  const { error } = await db().from("supplier_imports").insert({ store_id: auth.storeId, supplier_product_id: source.id, product_id: "pending", created_at: Date.now() });
  if (error) {
    if (isUniqueViolation(error)) throw new ApiError("delivery_exists"); // reused code: "already there"
    must("vitrine.claim", { data: null, error });
  }

  try {
    const created = await createProduct(auth, {
      title: source.name.slice(0, 120),
      description: source.description,
      category: CATEGORY[source.category] ?? "other",
      status: "draft",
      costPrice: source.costPrice,
      salePrice: suggestedSalePrice(source.costPrice),
      images: [],
      stock: null,
      compareAtPrice: null,
      offerEndsAt: null,
    });
    // The photo: copied as bytes (it was already validated when the supplier uploaded it).
    const image = await approvedImage(source.id);
    if (image) {
      const record = await productRepository.get(auth.storeId, created.id);
      if (record) {
        record.images = [{ id: newImageId(), mime: image.mime, data: image.data }];
        await productRepository.save(record);
      }
    }
    must("vitrine.claim.done", await db().from("supplier_imports").update({ product_id: created.id }).eq("store_id", auth.storeId).eq("supplier_product_id", source.id));
    return { productId: created.id };
  } catch (err) {
    await db().from("supplier_imports").delete().eq("store_id", auth.storeId).eq("supplier_product_id", source.id);
    throw err;
  }
}
