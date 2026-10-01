/** The shape of a Vitrine product (an approved supplier product, see `shared/vitrine/catalog.ts`). Prices are minor units. */
export type VitrineKind = "nacional" | "internacional";

export const VITRINE_CATEGORIES = ["beauty", "toys", "fashion", "home", "jewelry", "health", "tech", "pets"] as const;
export type VitrineCategory = (typeof VITRINE_CATEGORIES)[number];

export interface VitrineProduct {
  id: string;
  sku: string;
  kind: VitrineKind;
  title: string;
  brand: string;
  category: VitrineCategory;
  /** Cost price in minor units (Kz × 100). */
  costPrice: number;
  hot: boolean;
  bestSeller: boolean;
  kit: boolean;
  isNew: boolean;
  inStock: boolean;
  /** A seasonal campaign the product belongs to, if any. */
  occasion?: "children";
  /** Real catalogue only (an approved supplier product): */
  description?: string;
  /** Units the supplier has. */
  stock?: number;
  imageUrl?: string;
  supplierId?: string;
  supplierName?: string;
}
