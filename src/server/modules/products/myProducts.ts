import "server-only";
import { db, must } from "@/server/db/client";
import { orderRepository } from "@/server/modules/orders/repository";
import type { MyProductRow } from "@/shared/products/myProducts";
import { suggestedSalePrice } from "@/shared/vitrine/catalog";
import { productRepository } from "./repository";
import { toPublic } from "./service";

const MONTH = 30 * 86_400_000;

/** The merchant's product table: every product of THIS store, with where it came from and what it sold this month. */
export async function myProductRows(storeId: string, now = Date.now()): Promise<MyProductRow[]> {
  const [products, imports, orders] = await Promise.all([
    productRepository.all(storeId),
    db().from("supplier_imports").select("product_id").eq("store_id", storeId).then((r) => must("myProducts.imports", r) ?? []),
    orderRepository.all(storeId),
  ]);
  const imported = new Set(imports.map((r) => String(r.product_id)));

  const sold = new Map<string, number>();
  for (const o of orders) {
    if (o.status === "cancelled" || now - o.createdAt > MONTH) continue;
    for (const item of o.items) if (item.productId) sold.set(item.productId, (sold.get(item.productId) ?? 0) + item.quantity);
  }

  return products.map((record) => {
    const p = toPublic(record);
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      status: p.status,
      stock: p.stock,
      costPrice: p.costPrice,
      salePrice: p.salePrice,
      suggestedPrice: suggestedSalePrice(p.costPrice),
      salesMonth: sold.get(p.id) ?? 0,
      views: p.views,
      origin: imported.has(p.id) ? "supplier" : "own",
      cover: p.images[0]?.url ?? null,
    };
  });
}
