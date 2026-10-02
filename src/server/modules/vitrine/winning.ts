import "server-only";
import { db, must } from "@/server/db/client";
import { COLUMNS, fromRow, type CatalogProduct } from "./service";

/**
 * "Winning Products": approved catalogue products that the Kandrop team highlights. Reads degrade to "none"
 * (never an error page) if the `is_winning_product` migration has not been applied yet.
 */
export async function listWinningProducts(limit = 6): Promise<CatalogProduct[]> {
  try {
    const rows = must(
      "winning.list",
      await db()
        .from("supplier_products")
        .select(COLUMNS)
        .eq("is_winning_product", true)
        .eq("status", "approved")
        .eq("suppliers.status", "approved")
        .order("updated_at", { ascending: false })
        .limit(limit)
    );
    return (rows ?? []).map(fromRow);
  } catch {
    return [];
  }
}

/** Ids of every highlighted product (any status): the admin catalogue marks them. */
export async function winningIds(): Promise<Set<string>> {
  try {
    const rows = must("winning.ids", await db().from("supplier_products").select("id").eq("is_winning_product", true));
    return new Set((rows ?? []).map((r) => String(r.id)));
  } catch {
    return new Set();
  }
}

/** Highlights or un-highlights a product. `null` when it does not exist. */
export async function setWinning(id: string, winning: boolean): Promise<{ before: boolean } | null> {
  const current = must("winning.get", await db().from("supplier_products").select("is_winning_product").eq("id", id).maybeSingle());
  if (!current) return null;
  must("winning.set", await db().from("supplier_products").update({ is_winning_product: winning }).eq("id", id));
  return { before: current.is_winning_product === true };
}
