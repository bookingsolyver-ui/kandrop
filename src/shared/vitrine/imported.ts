import type { VitrineKind, VitrineProduct } from "./mock";

/**
 * A product the merchant imported from the Vitrine into "My products". For the demo it lives in the
 * browser (`src/lib/vitrine/store.ts`); the shape is the contract for the Supabase table that replaces
 * it (`store_products`: store, catalogue product, sale price, status). Money is Kwanzas in minor units.
 */
export type StockLevel = "high" | "low" | "out";
export type ImportedStatus = "active" | "paused";

export interface ImportedProduct {
  id: string;
  sku: string;
  kind: VitrineKind;
  title: string;
  /** What the supplier charges: the merchant's cost. */
  costPrice: number;
  /** The price the platform suggests for selling it. */
  suggestedPrice: number;
  /** The price the merchant actually sells at (editable). */
  salePrice: number;
  stock: StockLevel;
  status: ImportedStatus;
  /** Units sold this month. */
  salesMonth: number;
}

/** The platform suggests roughly double the cost, rounded to a tidy 100 Kz. */
const suggested = (cost: number) => Math.round((cost * 2.1) / 10_000) * 10_000;

/** What importing a Vitrine product creates in "My products": active, at the suggested price. */
export function importFromCatalog(source: VitrineProduct): ImportedProduct {
  const suggestedPrice = suggested(source.costPrice);
  return {
    id: source.id,
    sku: source.sku,
    kind: source.kind,
    title: source.title,
    costPrice: source.costPrice,
    suggestedPrice,
    salePrice: suggestedPrice,
    stock: source.inStock ? "high" : "out",
    status: "active",
    salesMonth: 0,
  };
}

/** Profit per unit and as a share of the sale price. */
export const marginOf = (p: Pick<ImportedProduct, "costPrice" | "salePrice">) => ({
  amount: p.salePrice - p.costPrice,
  rate: p.salePrice > 0 ? (p.salePrice - p.costPrice) / p.salePrice : 0,
});
