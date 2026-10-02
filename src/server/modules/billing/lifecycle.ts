import { db, must } from "@/server/db/client";
import { getEnv } from "@/server/config/env";
import { orderPaymentInfo } from "@/server/modules/payments/transfer";
import { sendSubscriptionEmail } from "@/server/modules/notifications/subscriptionEmail";
import { PERIOD_DAYS } from "@/shared/billing/schemas";
import { PLAN_PRICES } from "@/server/modules/plan/limits";
import { billingRepository } from "./repository";
import type { SubscriptionRecord } from "./schema";

const DAY = 86_400_000;
/** The reminder goes out when the period has 3 days (or fewer, never negative) left, once per period. */
export const REMINDER_DAYS = 3;
const PLAN_NAMES = { starter: "Starter", pro: "Pro" } as const;

interface OwnerInfo { name: string; email: string; storeName: string }

async function ownersOf(storeIds: string[]): Promise<Map<string, OwnerInfo>> {
  if (storeIds.length === 0) return new Map();
  const rows = must("lifecycle.owners", await db().from("users").select("store_id,email,full_name,store_name").eq("role", "owner").in("store_id", storeIds)) ?? [];
  return new Map(rows.map((r) => [String(r.store_id), { name: String(r.full_name), email: String(r.email), storeName: String(r.store_name) }]));
}

export interface SweepResult {
  reminded: string[];
  deactivated: string[];
  /** E-mails that could not be sent (no provider configured, refused, timed out): the state change itself still happened. */
  emailFailed: number;
  dryRun: boolean;
}

/** Who needs a reminder and who has to be switched off, at `now`. Pure: reads the rows, changes nothing. */
export function classify(subs: SubscriptionRecord[], now: number) {
  const remind = subs.filter((s) => !s.suspended && s.periodEnd > now && s.periodEnd - now <= REMINDER_DAYS * DAY && s.renewalNoticeFor !== s.periodEnd);
  const expire = subs.filter((s) => !s.suspended && s.periodEnd <= now);
  return { remind, expire };
}

/**
 * THE DAILY JOB. (1) A store whose paid period ends within 3 days gets one reminder e-mail per period. (2) A store whose
 * period already ended is switched off (`suspended`, reason `expired`): the payment gate then refuses the dashboard, and
 * only an administrator switches it back on. A failed e-mail never stops the state change, and one failing store never
 * stops the others. Safe to run twice: reminders are marked per period and a switched-off account is skipped.
 */
export async function runSubscriptionSweep(now = Date.now(), dryRun = false): Promise<SweepResult> {
  const subs = await billingRepository.allSubscriptions();
  const { remind, expire } = classify(subs, now);
  const owners = await ownersOf([...remind, ...expire].map((s) => s.storeId));
  const env = getEnv();
  const support = { whatsapp: orderPaymentInfo().whatsapp ?? null, email: env.SUPPORT_EMAIL ?? null };
  const result: SweepResult = { reminded: [], deactivated: [], emailFailed: 0, dryRun };

  for (const s of remind) {
    result.reminded.push(s.storeId);
    if (dryRun) continue;
    try {
      const owner = owners.get(s.storeId);
      const sent = owner
        ? await sendSubscriptionEmail("reminder", { to: owner.email, name: owner.name, storeName: owner.storeName, planName: PLAN_NAMES[s.plan], periodEnd: s.periodEnd, renewalAmount: PLAN_PRICES[s.plan] * 100, support })
        : false;
      if (!sent) result.emailFailed += 1;
      // Marked even when the provider is down or unset: re-sending every day would spam, and the admin list shows the deadline anyway.
      await billingRepository.markRenewalNotice(s.storeId, s.periodEnd);
    } catch (error) {
      console.error("[subscriptions] reminder failed", { storeId: s.storeId, error: error instanceof Error ? error.message : error });
    }
  }

  for (const s of expire) {
    result.deactivated.push(s.storeId);
    if (dryRun) continue;
    try {
      await billingRepository.setSuspension(s.storeId, { suspended: true, reason: "expired" });
      const owner = owners.get(s.storeId);
      const sent = owner
        ? await sendSubscriptionEmail("deactivated", { to: owner.email, name: owner.name, storeName: owner.storeName, planName: PLAN_NAMES[s.plan], periodEnd: s.periodEnd, renewalAmount: PLAN_PRICES[s.plan] * 100, support })
        : false;
      if (!sent) result.emailFailed += 1;
    } catch (error) {
      console.error("[subscriptions] deactivation failed", { storeId: s.storeId, error: error instanceof Error ? error.message : error });
    }
  }
  return result;
}

/**
 * The administrator's switch. Deactivate: the account loses the dashboard at its next request. Activate: the account is
 * back; if its paid period had already ended, a new 30-day period starts now (the administrator confirms the payment
 * arrived), counted as one more paid period.
 */
export async function setAccountActive(storeId: string, active: boolean, now = Date.now()): Promise<{ suspended: boolean; periodEnd: number } | null> {
  const sub = await billingRepository.subscription(storeId);
  if (!sub) return null; // never paid: nothing to switch
  if (!active) {
    await billingRepository.setSuspension(storeId, { suspended: true, reason: "admin" });
    return { suspended: true, periodEnd: sub.periodEnd };
  }
  const lapsed = sub.periodEnd <= now;
  const periodEnd = lapsed ? now + PERIOD_DAYS * DAY : sub.periodEnd;
  await billingRepository.setSuspension(storeId, { suspended: false, reason: null, ...(lapsed ? { periodEnd, periodsPaid: sub.periodsPaid + 1 } : {}) });
  return { suspended: false, periodEnd };
}
