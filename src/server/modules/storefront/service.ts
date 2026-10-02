import { getEnv } from "@/server/config/env";
import { ApiError } from "@/server/http/errors";
import { userRepository } from "@/server/modules/auth/userRepository";
import { storeRepository } from "@/server/modules/store/repository";
import { productRepository } from "@/server/modules/products/repository";
import type { ProductRecord } from "@/server/modules/products/schema";
import { sendOrderConfirmation } from "@/server/modules/notifications/orderEmail";
import { couponRepository } from "@/server/modules/coupons/repository";
import { evaluateCoupon } from "@/server/modules/coupons/math";
import { placeOrder, supplierStockFor, unitCostFor } from "@/server/modules/fulfilment/service";
import { CASH_ON_DELIVERY, DEFAULT_ORDER_PAYMENT_PROVIDER } from "@/shared/payments/orderPayment";
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
    metaPixelId: await storeRepository.metaPixelOf(p.storeId),
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
 * Checks a coupon code for THIS product's store and works out what it takes off. The coupon must belong to the product's
 * own store and be active, and it must pass the anti-loss lock (`evaluateCoupon`): any failure is the same plain
 * `coupon_unavailable`, so nothing is revealed about codes of other stores. Used by the live preview AND by the order.
 */
async function resolveCoupon(p: ProductRecord, rawCode: string): Promise<{ code: string; discount: number; total: number }> {
  const code = rawCode.trim().toUpperCase();
  const coupon = code ? await couponRepository.findActive(p.storeId, code) : null;
  if (!coupon) throw new ApiError("coupon_unavailable");
  const unitPrice = offerOf(p, Date.now()).price;
  const unitCost = await unitCostFor(p.storeId, p.id, p.costPrice);
  const result = evaluateCoupon({ type: coupon.type, value: coupon.value, unitPrice, unitCost, quantity: 1, shipping: 0, commissionBps: getEnv().COMMISSION_BPS });
  if (!result.ok) throw new ApiError("coupon_unavailable");
  return { code: coupon.code, discount: result.discount, total: result.total };
}

/** The live preview behind "Aplicar" at checkout: what the coupon takes off, or `coupon_unavailable`. */
export async function previewStorefrontCoupon(slug: string, code: string) {
  return resolveCoupon(await publicProduct(slug), code);
}

/**
 * "Buy now": the order is PLACED at the price of that very second (taken on the server, never from the browser),
 * UNPAID. The shopper PAYS THE COURIER ON DELIVERY (cash on delivery): the order may be prepared and shipped at once and
 * is settled when it is delivered. Returns the order id (the unguessable link to the order page). `out_of_stock` when nothing is left.
 */
export async function placeStorefrontOrder(slug: string, rawBuyer: unknown): Promise<string> {
  // Who buys and where it goes: validated here, on the server, whatever the browser did.
  const buyer = buyerSchema.parse(rawBuyer);
  const p = await publicProduct(slug);
  if (stockState(p.stock) === "out") throw new ApiError("out_of_stock");
  // A product imported from a supplier is limited by what the supplier has.
  const supplierStock = await supplierStockFor(p.storeId, p.id);
  if (supplierStock !== null && supplierStock < 1) throw new ApiError("out_of_stock");
  // The coupon is checked again here, on the server, whatever the preview said: this is the final word.
  const coupon = buyer.coupon ? await resolveCoupon(p, buyer.coupon) : undefined;
  const { order } = await placeOrder({
    storeId: p.storeId,
    storeName: await storeNameOf(p.storeId),
    productId: p.id,
    // The store has no shipping rates yet, so none is added (see docs/ARCHITECTURE.md).
    shippingAmount: 0,
    item: { name: p.title, quantity: 1, unitAmount: offerOf(p, Date.now()).price },
    buyer: { customer: { name: buyer.name, phone: buyer.phone, email: buyer.email }, address: { street: buyer.street, city: buyer.city, province: buyer.province, reference: buyer.reference, deliveryDate: buyer.deliveryDate } },
    coupon: coupon ? { code: coupon.code, discount: coupon.discount } : undefined,
    // Cash on delivery: the shopper pays the courier; the manual provider stays the (optional) verifier.
    provider: DEFAULT_ORDER_PAYMENT_PROVIDER,
    method: CASH_ON_DELIVERY,
  });
  // The order is saved. The confirmation e-mail is best effort: it can never undo or fail the order.
  try {
    await sendOrderConfirmation({
      to: buyer.email,
      customerName: buyer.name,
      orderNumber: order.number,
      storeName: await storeNameOf(p.storeId),
      productTitle: p.title,
      quantity: 1,
      unitAmount: order.items[0]?.unitAmount ?? 0,
      discount: coupon?.discount ?? 0,
      total: order.total,
      couponCode: coupon?.code,
      deliveryDate: buyer.deliveryDate,
    });
  } catch (err) {
    console.error("[email] could not prepare the order confirmation", err instanceof Error ? err.message : err);
  }
  return order.id;
}

export async function getStorefrontImage(slug: string, imageId: string) {
  const product = await publicProduct(slug);
  const image = await productRepository.image(product.storeId, product.id, imageId);
  if (!image) throw new ApiError("not_found");
  return image;
}
