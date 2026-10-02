import "server-only";
import { db, must } from "@/server/db/client";

export type NotificationScope = "merchant" | "supplier" | "admin";

export interface SaleNotification {
  /** Stable id (an order id, or a supplier line id): the browser shows each one once. */
  id: string;
  kind: "sale" | "supply" | "platform";
  orderNumber: number;
  /** Minor units: the order total (merchant, admin); not given to suppliers. */
  amount: number | null;
  at: number;
}

/** Orders created after `since`, for ONE audience. Every query is scoped by the caller's own id, never by the browser. */
export async function newSales(scope: NotificationScope, owner: { storeId?: string; supplierId?: string }, since: number): Promise<SaleNotification[]> {
  if (scope === "supplier") {
    if (!owner.supplierId) return [];
    const rows = must("notify.supplier", await db().from("supplier_orders").select("id,order_number,created_at").eq("supplier_id", owner.supplierId).gt("created_at", since).order("created_at", { ascending: true }).limit(20)) ?? [];
    return rows.map((r) => ({ id: String(r.id), kind: "supply", orderNumber: Number(r.order_number), amount: null, at: Number(r.created_at) }));
  }
  let q = db().from("orders").select("id,number,total,created_at").gt("created_at", since).order("created_at", { ascending: true }).limit(20);
  if (scope === "merchant") {
    if (!owner.storeId) return [];
    q = q.eq("store_id", owner.storeId);
  }
  const rows = must("notify.orders", await q) ?? [];
  return rows.map((r) => ({ id: String(r.id), kind: scope === "admin" ? "platform" : "sale", orderNumber: Number(r.number), amount: Number(r.total), at: Number(r.created_at) }));
}
