import { db, must, rows } from "@/server/db/client";
import type { ChargeRecord, SubscriptionRecord } from "./schema";

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
    return row
      ? { storeId, plan: row.plan as SubscriptionRecord["plan"], periodEnd: Number(row.period_end) }
      : null;
  },

  async saveSubscription(subscription: SubscriptionRecord): Promise<SubscriptionRecord> {
    must(
      "subscriptions.save",
      await db().from("subscriptions").upsert({
        store_id: subscription.storeId,
        plan: subscription.plan,
        period_end: subscription.periodEnd,
      })
    );
    return subscription;
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
