import { getEnv } from "@/server/config/env";
import type { Session } from "@/server/auth/types";
import { ApiError } from "@/server/http/errors";
import { buildCheckout } from "@/server/modules/checkout/service";
import { getPayment } from "@/server/modules/payments/service";
import { paymentRepository } from "@/server/modules/payments/repository";
import {
  PLANS,
  PLAN_KEYS,
  PLAN_PRICES,
  planRank,
  type PlanKey,
} from "@/server/modules/plan/limits";
import { getPlan } from "@/server/modules/plan/service";
import { receiptRepository } from "@/server/modules/receipts/repository";
import { upgradeSchema, type UpgradeInput } from "@/shared/billing/schemas";
import { planOf } from "./plan";
import { billingRepository } from "./repository";
import type { BillingOverview, PublicInvoice, PublicPlan, UpgradeSession } from "./schema";

const KZ = 100;
/** Sessions that carry a plan payment belong to the platform, never to the store paying. */
const PLATFORM_STORE_ID = "sto_kandrop";
const PLAN_NAMES: Record<PlanKey, string> = {
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

function requireOwner(auth: Session) {
  if (auth.role !== "owner") throw new ApiError("forbidden");
}

function action(plan: PlanKey, current: PlanKey): PublicPlan["action"] {
  if (plan === current) return plan === "starter" ? "current" : "renew";
  return planRank(plan) > planRank(current) ? "upgrade" : "included";
}

/** Every attempt that reached a payment, newest first. Reading a payment settles it if due. */
function invoicesOf(storeId: string): PublicInvoice[] {
  const out: PublicInvoice[] = [];
  for (const charge of billingRepository.charges(storeId)) {
    const latest = paymentRepository.bySession(charge.sessionId)[0];
    if (!latest) continue; // opened the dialog but never paid: not an invoice
    const payment = getPayment(latest.id)!;
    const paid = payment.status === "success";
    out.push({
      id: charge.sessionId,
      number: paid ? (receiptRepository.byPayment(payment.id)?.number ?? null) : null,
      date: payment.paidAt ?? payment.createdAt,
      plan: charge.plan,
      amount: charge.amount,
      status: paid ? "paid" : payment.status === "pending" ? "pending" : "failed",
      paymentId: paid ? payment.id : null,
    });
  }
  return out.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

/** The billing page in one call: plan, usage, the plan cards and the invoices. Owner only. */
export async function getBilling(auth: Session): Promise<BillingOverview> {
  requireOwner(auth);
  const invoices = invoicesOf(auth.storeId); // first: it may settle a payment and switch a plan on
  const now = Date.now();
  const plan = planOf(auth.storeId, now);
  const sub = billingRepository.subscription(auth.storeId);
  const usage = (await getPlan(auth)).usage;

  return {
    plan,
    periodEnd: plan === "starter" || !sub ? null : new Date(sub.periodEnd).toISOString(),
    lapsedPlan: plan === "starter" && sub && sub.periodEnd <= now ? sub.plan : null,
    usage,
    plans: PLAN_KEYS.map((key) => ({
      key,
      price: PLAN_PRICES[key] * KZ,
      limits: PLANS[key],
      action: action(key, plan),
    })),
    invoices,
    sandbox: getEnv().PAYMENTS_MODE === "sandbox",
  };
}

/**
 * Starts paying for a plan: a checkout session (owned by the platform) for one 30-day period at
 * the plan's price, which the billing dialog pays with the ordinary payment form. Owner only.
 * You can renew the plan you are on or move up; a smaller plan than the active one is refused.
 */
export async function startUpgrade(auth: Session, input: UpgradeInput): Promise<UpgradeSession> {
  requireOwner(auth);
  const { plan } = upgradeSchema.parse(input);
  if (planRank(plan) < planRank(planOf(auth.storeId))) throw new ApiError("plan_not_upgradable");

  const amount = PLAN_PRICES[plan] * KZ;
  const session = buildCheckout({
    storeId: PLATFORM_STORE_ID,
    storeName: "Kandrop",
    storeNif: null,
    shippingAmount: 0,
    // A neutral name: it is printed on the receipt in whatever language the reader uses.
    items: [{ name: `Kandrop ${PLAN_NAMES[plan]} · 30 d`, quantity: 1, unitAmount: amount }],
    subscription: { storeId: auth.storeId, plan },
  });
  billingRepository.addCharge({
    sessionId: session.id,
    storeId: auth.storeId,
    plan,
    amount,
    createdAt: Date.now(),
    activated: false,
  });
  return { sessionId: session.id, plan, amount };
}
