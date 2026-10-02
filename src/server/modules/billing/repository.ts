import "server-only";
import { db, must, rows } from "@/server/db/client";
import { PLAN_KEYS } from "@/server/modules/plan/limits";
import type { PaidPlan } from "@/shared/billing/schemas";
import type { ChargeRecord, SubscriptionRecord } from "./schema";

/**
 * A stored plan is untrusted text: trim and lower-case it, and accept only a real plan key. Anything else
 * (a stray line break, an old name) is `null`, which the rest of the app already handles as "no active plan";
 * it must never reach `PLANS[plan]` as a key that does not exist.
 */
export function normalizePlan(raw: unknown): SubscriptionRecord["plan"] | null {
  const value = String(raw ?? "").replace(/\s/g, "").toLowerCase();
  return (PLAN_KEYS as readonly string[]).includes(value) ? (value as SubscriptionRecord["plan"]) : null;
}

const chargeFromRow = (row: Record<string, unknown>): ChargeRecord => ({
  sessionId: String(row.session_id),
  storeId: String(row.store_id),
  plan: row.plan as ChargeRecord["plan"],
  amount: Number(row.amount),
  createdAt: Number(row.created_at),
  activated: Boolean(row.activated),
});

export const billingRepository = {
  async subscription(storeId: string): Promise<SubscriptionRecord | null> {
    const row = must(
      "subscriptions.get",
      await db().from("subscriptions").select("*").eq("store_id", storeId).maybeSingle()
    );
    if (!row) return null;
    const plan = normalizePlan(row.plan);
    if (!plan) {
      console.error("[billing] a subscription has an unknown plan value; treated as no active plan", { storeId, plan: JSON.stringify(String(row.plan)) });
      return null;
    }
    return {
      storeId,
      plan,
      periodEnd: Number(row.period_end),
      startedAt: row.started_at == null ? null : Number(row.started_at),
      periodsPaid: Number(row.periods_paid ?? 0),
      pending: Boolean(row.pending),
      requestedAt: row.requested_at == null ? null : Number(row.requested_at),
      suspended: Boolean(row.suspended),
      suspendedReason: row.suspended_reason === "expired" || row.suspended_reason === "admin" ? row.suspended_reason : null,
      renewalNoticeFor: row.renewal_notice_for == null ? null : Number(row.renewal_notice_for),
    };
  },

  async saveSubscription(subscription: SubscriptionRecord): Promise<SubscriptionRecord> {
    const base = { store_id: subscription.storeId, plan: subscription.plan, period_end: subscription.periodEnd };
    const full = await db().from("subscriptions").upsert({ ...base, started_at: subscription.startedAt, periods_paid: subscription.periodsPaid, pending: subscription.pending, requested_at: subscription.requestedAt });
    // Until the cycle migration is applied the columns do not exist: keep billing alive and say so (the price rule reads the charges, not these columns).
    if (full.error && /started_at|periods_paid|pending|requested_at/.test(full.error.message)) {
      // A pending request cannot be stored without its columns (it would become a plain expired row): refuse instead of degrading.
      if (subscription.pending) must("subscriptions.save", full);
      console.error("[billing] subscription columns are missing; apply the pending supabase/migrations");
      must("subscriptions.save", await db().from("subscriptions").upsert(base));
    } else {
      must("subscriptions.save", full);
    }
    return subscription;
  },

  /** Every subscription row, for the daily job and the administrator's view. */
  async allSubscriptions(): Promise<SubscriptionRecord[]> {
    // Page by page: the API returns at most 1000 rows per request.
    const list: Array<Record<string, unknown>> = [];
    for (let from = 0; ; from += 1000) {
      const page = rows("subscriptions.all", await db().from("subscriptions").select("*").order("store_id").range(from, from + 999));
      list.push(...page);
      if (page.length < 1000) break;
    }
    return list.flatMap((row) => {
      const plan = normalizePlan(row.plan);
      return plan
        ? [{
            storeId: String(row.store_id),
            plan,
            periodEnd: Number(row.period_end),
            startedAt: row.started_at == null ? null : Number(row.started_at),
            periodsPaid: Number(row.periods_paid ?? 0),
            pending: Boolean(row.pending),
            requestedAt: row.requested_at == null ? null : Number(row.requested_at),
            suspended: Boolean(row.suspended),
            suspendedReason: row.suspended_reason === "expired" || row.suspended_reason === "admin" ? row.suspended_reason : null,
            renewalNoticeFor: row.renewal_notice_for == null ? null : Number(row.renewal_notice_for),
          } satisfies SubscriptionRecord]
        : [];
    });
  },

  /** Switches an account off or on (and, when switching on, may also give it a new period end). */
  async setSuspension(storeId: string, patch: { suspended: boolean; reason: "expired" | "admin" | null; periodEnd?: number; periodsPaid?: number; plan?: PaidPlan }): Promise<void> {
    must(
      "subscriptions.suspend",
      await db()
        .from("subscriptions")
        .update({
          suspended: patch.suspended,
          suspended_reason: patch.suspended ? patch.reason : null,
          suspended_at: patch.suspended ? Date.now() : null,
          ...(patch.periodEnd !== undefined ? { period_end: patch.periodEnd } : {}),
          ...(patch.periodsPaid !== undefined ? { periods_paid: patch.periodsPaid } : {}),
          ...(patch.plan !== undefined ? { plan: patch.plan } : {}),
        })
        .eq("store_id", storeId)
    );
  },

  async markRenewalNotice(storeId: string, periodEnd: number): Promise<void> {
    must("subscriptions.notice", await db().from("subscriptions").update({ renewal_notice_for: periodEnd }).eq("store_id", storeId));
  },

  async charges(storeId: string): Promise<ChargeRecord[]> {
    const list = rows(
      "charges.list",
      await db()
        .from("charges")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: true })
    );
    return list.map(chargeFromRow);
  },

  async addCharge(charge: ChargeRecord): Promise<ChargeRecord> {
    must(
      "charges.add",
      await db().from("charges").insert({
        session_id: charge.sessionId,
        store_id: charge.storeId,
        plan: charge.plan,
        amount: charge.amount,
        created_at: charge.createdAt,
        activated: charge.activated,
      })
    );
    return charge;
  },

  async chargeBySession(sessionId: string): Promise<ChargeRecord | null> {
    const row = must(
      "charges.bySession",
      await db().from("charges").select("*").eq("session_id", sessionId).maybeSingle()
    );
    return row ? chargeFromRow(row) : null;
  },

  /** Undoes `markActivated` when switching the plan on failed, so a retry can do it. */
  async releaseActivation(sessionId: string): Promise<void> {
    must(
      "charges.release",
      await db().from("charges").update({ activated: false }).eq("session_id", sessionId)
    );
  },

  /**
   * Marks a charge as having switched its plan on. Returns `true` only for the caller that flipped
   * it (a conditional update), so a payment activates a plan exactly once even under concurrency.
   */
  async markActivated(sessionId: string): Promise<boolean> {
    const flipped = rows(
      "charges.activate",
      await db()
        .from("charges")
        .update({ activated: true })
        .eq("session_id", sessionId)
        .eq("activated", false)
        .select("session_id")
    );
    return flipped.length > 0;
  },
};
