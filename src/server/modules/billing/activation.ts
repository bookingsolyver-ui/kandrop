import type { CheckoutSession } from "@/server/modules/checkout/schema";
import { PERIOD_DAYS } from "@/shared/billing/schemas";
import { billingRepository } from "./repository";

const DAY = 86_400_000;

/**
 * Called by the payments module the moment a payment is confirmed (`markPaid`, the one place
 * every success passes through — card, Multicaixa webhook or polling). If the session was a
 * store paying for a plan, that plan is switched on for `PERIOD_DAYS`.
 *
 * Renewing the plan the store is on adds the days after the current period ends; moving up to
 * a bigger plan starts a fresh period now (there is no pro-rata credit for the old one).
 * Idempotent: a charge activates once, however many times it is called.
 *
 * Kept free of imports from `payments`, which imports this: no cycle.
 */
export async function activateSubscription(session: CheckoutSession, paidAt: number): Promise<void> {
  const target = session.subscription;
  if (!target) return;
  const charge = await billingRepository.chargeBySession(session.id);
  if (!charge || charge.activated) return;
  // Claim the charge first (atomic): whoever flips it is the only one that extends the period.
  if (!(await billingRepository.markActivated(session.id))) return;

  try {
    const current = await billingRepository.subscription(target.storeId);
    const renewing = current?.plan === target.plan && current.periodEnd > paidAt;
    await billingRepository.saveSubscription({
      storeId: target.storeId,
      plan: target.plan,
      periodEnd: (renewing ? current.periodEnd : paidAt) + PERIOD_DAYS * DAY,
    });
  } catch (error) {
    await billingRepository.releaseActivation(session.id); // so a retry can still switch it on
    throw error;
  }
}
