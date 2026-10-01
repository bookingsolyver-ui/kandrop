import { VITRINE_CATEGORIES, type VitrineCategory, type VitrineProduct } from "./types";

/** A starting sale price: cost × 1.5, rounded to a tidy 100 Kz (minor units). The merchant can change it afterwards. */
export const suggestedSalePrice = (cost: number) => Math.max(cost + 10_000, Math.round((cost * 1.5) / 10_000) * 10_000);

/** The part of an approved supplier product the Vitrine needs (see `server/modules/vitrine/service.ts`). */
export interface ApprovedProductData {
  id: string;
  supplierId: string;
  supplierName: string;
  name: string;
  description: string;
  category: string;
  costPrice: number;
  stock: number;
  hasImage: boolean;
  createdAt: number;
  updatedAt: number;
}

const NEW_FOR = 14 * 86_400_000;

/** An approved supplier product as the showcase's cards and filters understand it. */
export function toVitrineProduct(p: ApprovedProductData, now = Date.now()): VitrineProduct {
  const category: VitrineCategory = (VITRINE_CATEGORIES as readonly string[]).includes(p.category) ? (p.category as VitrineCategory) : "home";
  return {
    id: p.id,
    sku: `SUP-${p.id.slice(0, 6).toUpperCase()}`,
    kind: "nacional", // every supplier signs up with a national warehouse for now
    title: p.name,
    brand: p.supplierName,
    category,
    costPrice: p.costPrice,
    hot: false,
    bestSeller: false,
    kit: false,
    isNew: now - p.createdAt < NEW_FOR,
    inStock: p.stock > 0,
    description: p.description,
    stock: p.stock,
    imageUrl: p.hasImage ? `/api/vitrine/products/${p.id}/image?v=${p.updatedAt}` : undefined,
    supplierId: p.supplierId,
    supplierName: p.supplierName,
  };
}
