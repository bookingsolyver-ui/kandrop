import { db, must } from "@/server/db/client";
import { billingRepository } from "@/server/modules/billing/repository";
import { PLAN_PRICES } from "@/server/modules/plan/limits";
import type { SubscriptionRow } from "@/shared/admin/types";

const DAY = 86_400_000;

/** Every merchant account with its subscription, soonest deadline first, then the accounts that never paid. Administrators only. */
export async function subscriptionsOverview(now = Date.now()): Promise<SubscriptionRow[]> {
  const [users, subs] = await Promise.all([
    db().from("users").select("store_id,email,full_name,store_name").eq("role", "owner").limit(5000),
    billingRepository.allSubscriptions(),
  ]);
  const subOf = new Map(subs.map((s) => [s.storeId, s]));
  const rows = (must("admin.sub.users", users) ?? []).map((u): SubscriptionRow => {
    const storeId = String(u.store_id);
    const s = subOf.get(storeId);
    const base = { storeId, store: String(u.store_name), owner: String(u.full_name), email: String(u.email) };
    if (!s) return { ...base, plan: null, state: "pending", reason: null, startedAt: null, periodsPaid: 0, periodEnd: null, daysLeft: null, reminded: false, renewalAmount: null };
    const expired = s.periodEnd <= now;
    return {
      ...base,
      plan: s.plan,
      state: s.suspended || expired ? "inactive" : "active",
      reason: s.suspended ? s.suspendedReason ?? "admin" : expired ? "expired" : null,
      startedAt: s.startedAt,
      periodsPaid: s.periodsPaid,
      periodEnd: s.periodEnd,
      daysLeft: Math.ceil((s.periodEnd - now) / DAY),
      reminded: s.renewalNoticeFor === s.periodEnd,
      renewalAmount: PLAN_PRICES[s.plan] * 100,
    };
  });
  return rows.sort((a, b) => (a.periodEnd ?? Infinity) - (b.periodEnd ?? Infinity));
}
