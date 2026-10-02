import { randomBytes } from "node:crypto";
import { db } from "@/server/db/client";

/** The sensitive actions of /admin that leave a trail. */
export const AUDIT_ACTIONS = [
  "supplier_product.approve",
  "supplier_product.reject",
  "supplier.approve",
  "supplier.reject",
  "supplier.hold",
  "commission.update",
  "payout.approve",
  "payout.reject",
  "payout.approve_batch",
  "logistics.update",
  "payment.proof",
  "payment.verify",
  "order.cancel",
  "withdrawal.pay",
  "withdrawal.reject",
  "withdrawal.export",
  "user.revoke_sessions",
  "user.ban",
  "user.unban",
  "subscription.activate",
  "subscription.deactivate",
  "subscription.renew",
  "notification.maintenance",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditEntry {
  id: string;
  at: number;
  actorId: string;
  actorEmail: string | null;
  action: string;
  target: string;
  before: unknown;
  after: unknown;
  ip: string | null;
}

export async function recordAudit(entry: Omit<AuditEntry, "id" | "at">): Promise<void> {
  const { error } = await db()
    .from("audit_logs")
    .insert({
      id: `aud_${randomBytes(9).toString("base64url")}`,
      at: Date.now(),
      actor_id: entry.actorId,
      actor_email: entry.actorEmail,
      action: entry.action,
      target: entry.target,
      before: entry.before ?? null,
      after: entry.after ?? null,
      ip: entry.ip,
    });
  if (error) {
    console.error("[audit] could not record", error.code, error.message);
    throw new Error("Database error: audit insert");
  }
}

/** Newest first. `missing` is true while the `audit_logs` table has not been created (migration not run). */
export async function listAudit(limit = 200): Promise<{ rows: AuditEntry[]; missing: boolean }> {
  const { data, error } = await db().from("audit_logs").select("*").order("at", { ascending: false }).limit(limit);
  if (error) {
    console.error("[audit] could not list", error.code, error.message);
    return { rows: [], missing: true };
  }
  return {
    missing: false,
    rows: (data ?? []).map((r) => ({
      id: r.id,
      at: Number(r.at),
      actorId: r.actor_id,
      actorEmail: r.actor_email,
      action: r.action,
      target: r.target,
      before: r.before,
      after: r.after,
      ip: r.ip,
    })),
  };
}
