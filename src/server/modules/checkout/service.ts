import { randomBytes } from "node:crypto";
import { getEnv } from "@/server/config/env";
import type { Session } from "@/server/auth/types";
import { ApiError } from "@/server/http/errors";
import { userRepository } from "@/server/modules/auth/userRepository";
import { createCheckoutSchema, type CreateCheckoutInput } from "@/shared/checkout/schemas";
import { checkoutRepository } from "./repository";
import type { CheckoutSession, PublicCheckout } from "./schema";

const SESSION_TTL_MS = 30 * 60 * 1000;
const KZ = 100;

/** Every checkout session is made here, so the expiry and the total are computed in one place. */
export async function buildCheckout(
  base: Pick<CheckoutSession, "storeId" | "storeName" | "storeNif" | "items" | "shippingAmount"> &
    Partial<Pick<CheckoutSession, "subscription" | "productId" | "buyer">>
): Promise<CheckoutSession> {
  const subtotal = base.items.reduce((sum, i) => sum + i.unitAmount * i.quantity, 0);
  const now = Date.now();
  const session: CheckoutSession = {
    ...base,
    id: `chk_${randomBytes(16).toString("base64url")}`,
    currency: "AOA",
    total: subtotal + base.shippingAmount,
    paid: false,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };
  const saved = await checkoutRepository.save(session);
  await checkoutRepository.purgeExpired().catch(() => {}); // housekeeping: never fails a checkout
  return saved;
}

/** Merchant-side: turn a cart into a payable checkout session. */
export async function createCheckout(auth: Session, input: CreateCheckoutInput) {
  const data = createCheckoutSchema.parse(input);
  const owner = await userRepository.findById(auth.userId);
  return await buildCheckout({
    storeId: auth.storeId,
    storeName: owner?.storeName ?? "Loja Demo",
    storeNif: null, // the store settings do not collect a NIF yet (see `getStore`)
    items: data.items,
    shippingAmount: data.shippingAmount,
  });
}

/** Sandbox only: a ready-made cart so `/checkout` can be opened and tried straight away. */
export async function createDemoCheckout() {
  if (getEnv().PAYMENTS_MODE !== "sandbox") throw new ApiError("not_found");
  return await buildCheckout({
    storeId: "sto_demo",
    storeName: "Loja Demo",
    storeNif: null,
    shippingAmount: 2_500 * KZ,
    items: [
      { name: "Smartwatch Série X", quantity: 1, unitAmount: 32_000 * KZ },
      { name: "Auriculares sem fios Pro", quantity: 2, unitAmount: 18_500 * KZ },
    ],
  });
}

export function statusOf(session: CheckoutSession): PublicCheckout["status"] {
  if (session.paid) return "paid";
  return session.expiresAt <= Date.now() ? "expired" : "open";
}

export function toPublic(session: CheckoutSession): PublicCheckout {
  return {
    id: session.id,
    storeName: session.storeName,
    currency: session.currency,
    items: session.items,
    shippingAmount: session.shippingAmount,
    subtotal: session.total - session.shippingAmount,
    total: session.total,
    status: statusOf(session),
    expiresAt: new Date(session.expiresAt).toISOString(),
  };
}

export async function getPublicCheckout(id: string): Promise<PublicCheckout | null> {
  const session = await checkoutRepository.get(id);
  return session ? toPublic(session) : null;
}
