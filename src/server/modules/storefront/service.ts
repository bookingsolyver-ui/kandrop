import { getEnv } from "@/server/config/env";
import { ApiError } from "@/server/http/errors";
import { userRepository } from "@/server/modules/auth/userRepository";
import { buildCheckout } from "@/server/modules/checkout/service";
import { productRepository } from "@/server/modules/products/repository";
import type { ProductRecord } from "@/server/modules/products/schema";
import { supplierStockFor } from "@/server/modules/fulfilment/service";
import { buyerSchema } from "@/shared/fulfilment/schemas";
import { offerOf, stockState } from "@/shared/products/schemas";
import type { StorefrontProduct } from "./schema";

/** A product is public only while it is active: drafts and archived ones are "not found". */
async function publicProduct(slug: string): Promise<ProductRecord> {
  const product = await productRepository.bySlug(slug);
  if (!product || product.status !== "active") throw new ApiError("not_found");
  return product;
}

async function storeNameOf(storeId: string): Promise<string> {
  const owner = await userRepository.findOwnerByStore(storeId);
  return owner?.storeName ?? "Loja Demo";
}

export async function getStorefrontProduct(slug: string): Promise<StorefrontProduct> {
  const p = await publicProduct(slug);
  const now = Date.now();
  const offer = offerOf(p, now);
  const state = stockState(p.stock);
  return {
    slug: p.slug,
    title: p.title,
    description: p.description,
    storeName: await storeNameOf(p.storeId),
    currency: "AOA",
    images: p.images.map((image) => ({
      id: image.id,
      url: `/api/store/${p.slug}/images/${image.id}`,
    })),
    price: offer.price,
    regularPrice: offer.regularPrice,
    discountRate:
      offer.regularPrice === null
        ? null
        : Math.round(((offer.regularPrice - offer.price) / offer.regularPrice) * 100) / 100,
    offerEndsAt: offer.endsAt === null ? null : new Date(offer.endsAt).toISOString(),
    stock: state === "low" ? { state, remaining: p.stock! } : { state },
    now: new Date(now).toISOString(),
    sandbox: getEnv().PAYMENTS_MODE === "sandbox",
  };
}

/** Counts one page view (the "Views" column of the merchant's product table). */
export async function recordView(slug: string): Promise<void> {
  await productRepository.recordView(slug); // only counts active products
}

/**
 * "Buy now": a checkout session for one unit at the price that applies *this second* (taken on
 * the server, never from the browser), or `out_of_stock`. Stock is checked, not reserved.
 */
export async function createStorefrontCheckout(slug: string, rawBuyer: unknown): Promise<string> {
  // Who buys and where it goes: validated here, on the server, whatever the browser did.
  const buyer = buyerSchema.parse(rawBuyer);
  const p = await publicProduct(slug);
  if (stockState(p.stock) === "out") throw new ApiError("out_of_stock");
  // A product imported from a supplier is limited by what the supplier has.
  const supplierStock = await supplierStockFor(p.storeId, p.id);
  if (supplierStock !== null && supplierStock < 1) throw new ApiError("out_of_stock");
  const session = await buildCheckout({
    productId: p.id,
    buyer: { customer: { name: buyer.name, phone: buyer.phone }, address: { street: buyer.street, city: buyer.city, province: buyer.province, reference: buyer.reference } },
    storeId: p.storeId,
    storeName: await storeNameOf(p.storeId),
    storeNif: null,
    // The store has no shipping rates yet, so none is added (see docs/ARCHITECTURE.md).
    shippingAmount: 0,
    items: [{ name: p.title, quantity: 1, unitAmount: offerOf(p, Date.now()).price }],
  });
  return session.id;
}

export async function getStorefrontImage(slug: string, imageId: string) {
  const product = await publicProduct(slug);
  const image = await productRepository.image(product.storeId, product.id, imageId);
  if (!image) throw new ApiError("not_found");
  return image;
}
