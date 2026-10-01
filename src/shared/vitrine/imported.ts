import { INTERNATIONAL_PRODUCTS, NATIONAL_PRODUCTS, type VitrineKind } from "./mock";

/**
 * SAMPLE "my products" list: items a merchant imported from the Vitrine. Same idea as `mock.ts`: the
 * shape is the contract, the source becomes a Supabase table (`store_products`: store, catalogue
 * product, sale price, status) later. Money is Kwanzas in minor units.
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

const pick = (kind: VitrineKind, index: number) =>
  (kind === "nacional" ? NATIONAL_PRODUCTS : INTERNATIONAL_PRODUCTS)[index]!;

/** [catalogue kind, index, sale price Kz (0 = the suggested one), stock, status, sales this month] */
const IMPORTS: Array<[VitrineKind, number, number, StockLevel, ImportedStatus, number]> = [
  ["internacional", 3, 0, "high", "active", 18],
  ["internacional", 0, 0, "high", "active", 12],
  ["nacional", 0, 0, "high", "active", 9],
  ["internacional", 5, 29_900, "low", "active", 6],
  ["nacional", 2, 0, "high", "paused", 0],
  ["internacional", 12, 0, "out", "active", 0],
  ["nacional", 8, 0, "high", "active", 4],
  ["internacional", 20, 0, "high", "paused", 2],
  ["nacional", 10, 0, "low", "active", 7],
  ["internacional", 8, 0, "high", "active", 5],
  ["nacional", 15, 0, "high", "active", 3],
  ["internacional", 1, 0, "high", "active", 8],
];

/** The platform suggests roughly double the cost, rounded to a tidy 100 Kz. */
const suggested = (cost: number) => Math.round((cost * 2.1) / 10_000) * 10_000;

export const IMPORTED_PRODUCTS: ImportedProduct[] = IMPORTS.map(
  ([kind, index, sale, stock, status, salesMonth], i) => {
    const source = pick(kind, index);
    const suggestedPrice = suggested(source.costPrice);
    return {
      id: `imp-${String(i + 1).padStart(3, "0")}`,
      sku: source.sku,
      kind,
      title: source.title,
      costPrice: source.costPrice,
      suggestedPrice,
      salePrice: sale > 0 ? sale * 100 : suggestedPrice,
      stock,
      status,
      salesMonth,
    };
  }
);

/** Profit per unit and as a share of the sale price. */
export const marginOf = (p: Pick<ImportedProduct, "costPrice" | "salePrice">) => ({
  amount: p.salePrice - p.costPrice,
  rate: p.salePrice > 0 ? (p.salePrice - p.costPrice) / p.salePrice : 0,
});
