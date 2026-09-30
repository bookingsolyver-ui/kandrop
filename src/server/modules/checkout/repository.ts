import { db, must } from "@/server/db/client";
import type { CheckoutItem, CheckoutSession } from "./schema";

const toRow = (s: CheckoutSession) => ({
  id: s.id,
  store_id: s.storeId,
  store_name: s.storeName,
  store_nif: s.storeNif,
  currency: s.currency,
  items: s.items,
  shipping_amount: s.shippingAmount,
  total: s.total,
  paid: s.paid,
  subscription: s.subscription ?? null,
  created_at: s.createdAt,
  expires_at: s.expiresAt,
});

function fromRow(row: Record<string, unknown>): CheckoutSession {
  return {
    id: String(row.id),
    storeId: String(row.store_id),
    storeName: String(row.store_name),
    storeNif: row.store_nif === null ? null : String(row.store_nif),
    currency: "AOA",
    items: row.items as CheckoutItem[],
    shippingAmount: Number(row.shipping_amount),
    total: Number(row.total),
    paid: Boolean(row.paid),
    subscription: (row.subscription as CheckoutSession["subscription"]) ?? undefined,
    createdAt: Number(row.created_at),
    expiresAt: Number(row.expires_at),
  };
}

export const checkoutRepository = {
  async get(id: string): Promise<CheckoutSession | null> {
    const row = must(
      "checkout_sessions.get",
      await db().from("checkout_sessions").select("*").eq("id", id).maybeSingle()
    );
    return row ? fromRow(row) : null;
  },

  async save(session: CheckoutSession): Promise<CheckoutSession> {
    must("checkout_sessions.save", await db().from("checkout_sessions").upsert(toRow(session)));
    return session;
  },

  /** Removes abandoned (unpaid) sessions that expired over an hour ago, so they do not pile up. */
  async purgeExpired(): Promise<void> {
    const cutoff = Date.now() - 60 * 60 * 1000;
    must(
      "checkout_sessions.purge",
      await db().from("checkout_sessions").delete().eq("paid", false).lt("expires_at", cutoff)
    );
  },
};
