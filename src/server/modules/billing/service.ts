import { getEnv } from "@/server/config/env";
import type { Session } from "@/server/auth/types";
import { ApiError } from "@/server/http/errors";
import { checkoutRepository } from "@/server/modules/checkout/repository";
import { buildCheckout, statusOf } from "@/server/modules/checkout/service";
import { getPayment } from "@/server/modules/payments/service";
import { transferInfo } from "@/server/modules/payments/transfer";
import { paymentRepository } from "@/server/modules/payments/repository";
import {
  PLANS,
  PLAN_INTRO_PRICES,
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
import type {
  BillingOverview,
  ChargeRecord,
  PublicInvoice,
  PublicPlan,
  UpgradeSession,
} from "./schema";

const KZ = 100;
/** Sessions that carry a plan payment belong to the platform, never to the store paying. */
const PLATFORM_STORE_ID = "sto_kandrop";
const PLAN_NAMES: Record<PlanKey, string> = { starter: "Starter", pro: "Pro" };

/** The launch price is for the first paid month only: a store that has never had a payment activate a plan. */
export async function introEligible(storeId: string): Promise<boolean> {
  return !(await billingRepository.charges(storeId)).some((charge) => charge.activated);
}

const priceOf = (plan: PlanKey, intro: boolean) => (intro ? PLAN_INTRO_PRICES : PLAN_PRICES)[plan] * KZ;

function requireOwner(auth: Session) {
  if (auth.role !== "owner") throw new ApiError("forbidden");
}

function action(plan: PlanKey, current: PlanKey): PublicPlan["action"] {
  if (plan === current) return "renew";
  return planRank(plan) > planRank(current) ? "upgrade" : "included";
}

/** Every attempt that reached a payment, newest first. Reading a payment settles it if due. */
async function invoicesOf(storeId: string): Promise<PublicInvoice[]> {
  const out: PublicInvoice[] = [];
  for (const charge of await billingRepository.charges(storeId)) {
    const latest = (await paymentRepository.bySession(charge.sessionId))[0];
    if (!latest) continue; // opened the dialog but never paid: not an invoice
    const payment = (await getPayment(latest.id))!;
    const paid = payment.status === "success";
    out.push({
      id: charge.sessionId,
      number: paid ? ((await receiptRepository.byPayment(payment.id))?.number ?? null) : null,
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
  const invoices = await invoicesOf(auth.storeId); // first: it may settle a payment and switch a plan on
  const now = Date.now();
  const plan = await planOf(auth.storeId, now);
  const sub = await billingRepository.subscription(auth.storeId);
  // The payment gate keeps unpaid stores out of here; this is the same rule, in the service.
  if (!plan || !sub) throw new ApiError("payment_required");
  const usage = (await getPlan(auth)).usage;
  const intro = await introEligible(auth.storeId);

  return {
    plan,
    periodEnd: new Date(sub.periodEnd).toISOString(),
    usage,
    cycle: { periodsPaid: sub.periodsPaid, firstMonth: sub.periodsPaid <= 1, renewalPrice: PLAN_PRICES[plan] * KZ },
    plans: PLAN_KEYS.map((key) => ({
      key,
      price: priceOf(key, intro),
      regularPrice: PLAN_PRICES[key] * KZ,
      intro,
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
  const current = await planOf(auth.storeId);
  if (current && planRank(plan) < planRank(current)) throw new ApiError("plan_not_upgradable");

  const intro = await introEligible(auth.storeId);
  const amount = priceOf(plan, intro);

  // Coming back to the payment step (a reload, or after leaving with a bank transfer still waiting)
  // picks up the checkout that is still open instead of piling up new ones, so a pending transfer
  // is found again and cannot be requested twice. Needs enough time left to pay.
  const now = Date.now();
  const charges: ChargeRecord[] = await billingRepository.charges(auth.storeId);
  const candidates = await Promise.all(
    charges
      .filter((charge) => charge.plan === plan && !charge.activated)
      .map((charge) => checkoutRepository.get(charge.sessionId))
  );
  const reusable = candidates
    .flatMap((open) =>
      open && statusOf(open) === "open" && open.expiresAt - now > 10 * 60_000 ? [open] : []
    )
    .sort((x, y) => y.createdAt - x.createdAt)[0];
  if (reusable) return { sessionId: reusable.id, plan, amount, renewalAmount: PLAN_PRICES[plan] * KZ, intro, transfer: transferInfo() };

  const session = await buildCheckout({
    storeId: PLATFORM_STORE_ID,
    storeName: "Kandrop",
    storeNif: null,
    shippingAmount: 0,
    // A neutral name: it is printed on the receipt in whatever language the reader uses.
    items: [{ name: `Kandrop ${PLAN_NAMES[plan]} · 30 d`, quantity: 1, unitAmount: amount }],
    subscription: { storeId: auth.storeId, plan },
  });
  await billingRepository.addCharge({
    sessionId: session.id,
    storeId: auth.storeId,
    plan,
    amount,
    createdAt: Date.now(),
    activated: false,
  });
  return { sessionId: session.id, plan, amount, renewalAmount: PLAN_PRICES[plan] * KZ, intro, transfer: transferInfo() };
}
