import { randomBytes } from "node:crypto";
import { db, must } from "@/server/db/client";

/** One notice in the administrators' notification centre (the bell). Shared by every administrator. */
export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  read: boolean;
  createdAt: number;
}

const toNotification = (r: Record<string, unknown>): AdminNotification => ({
  id: String(r.id),
  title: String(r.title),
  message: String(r.message),
  type: String(r.type),
  link: r.link == null ? null : String(r.link),
  read: Boolean(r.read),
  createdAt: Number(r.created_at),
});

export async function createAdminNotification(n: { title: string; message: string; type: string; link?: string }): Promise<AdminNotification> {
  const row = { id: `adn_${randomBytes(9).toString("base64url")}`, title: n.title, message: n.message, type: n.type, link: n.link ?? null, read: false, created_at: Date.now() };
  must("adminNotifications.create", await db().from("admin_notifications").insert(row));
  return toNotification(row);
}

/** Newest first. `before` is the `createdAt` of the last item of the previous page (keyset pagination: stable while new ones arrive). */
export async function listAdminNotifications(opts: { limit: number; before?: number }): Promise<{ items: AdminNotification[]; unread: number; nextCursor: number | null }> {
  let q = db().from("admin_notifications").select("*").order("created_at", { ascending: false }).limit(opts.limit + 1);
  if (opts.before !== undefined) q = q.lt("created_at", opts.before);
  const rows = must("adminNotifications.list", await q) ?? [];
  const page = rows.slice(0, opts.limit).map(toNotification);
  const { count, error } = await db().from("admin_notifications").select("id", { count: "exact", head: true }).eq("read", false);
  if (error) throw new Error(`adminNotifications.unread: ${error.code} ${error.message}`);
  return { items: page, unread: count ?? 0, nextCursor: rows.length > opts.limit ? page[page.length - 1]!.createdAt : null };
}

/** Marks some (`ids`) or all notices as read. */
export async function markAdminNotificationsRead(target: { ids: string[] } | { all: true }): Promise<void> {
  let q = db().from("admin_notifications").update({ read: true }).eq("read", false);
  if ("ids" in target) q = q.in("id", target.ids);
  must("adminNotifications.read", await q);
}

/** Removes notices: the listed ones, only the already-read ones, or everything. */
export async function clearAdminNotifications(target: { ids: string[] } | { onlyRead: true } | { all: true }): Promise<void> {
  let q = db().from("admin_notifications").delete();
  if ("ids" in target) q = q.in("id", target.ids);
  else if ("onlyRead" in target) q = q.eq("read", true);
  else q = q.not("id", "is", null);
  must("adminNotifications.clear", await q);
}
