import type { PlanKey } from "@/server/modules/plan/limits";
import type { InvoiceStatus, PaidPlan } from "@/shared/billing/schemas";

/** A store's paid period. Outside it the store is on Starter (see `plan.ts`). */
export interface SubscriptionRecord {
  storeId: string;
  plan: PaidPlan;
  /** Epoch ms. */
  periodEnd: number;
}

/** One attempt to pay for a plan: the checkout session that carries the money. */
export interface ChargeRecord {
  sessionId: string;
  storeId: string;
  plan: PaidPlan;
  /** Minor units. */
  amount: number;
  createdAt: number;
  /** Whether this charge already switched the plan on (a payment must count once). */
  activated: boolean;
}

export interface PublicInvoice {
  id: string;
  /** `KD-2026-000123` once paid, `null` before. */
  number: string | null;
  /** When it was paid, or started while it is not. */
  date: string;
  plan: PaidPlan;
  amount: number;
  status: InvoiceStatus;
  /** The payment that carries the receipt document; `null` unless paid. */
  paymentId: string | null;
}

export interface PublicPlan {
  key: PlanKey;
  /** Minor units per month. */
  price: number;
  limits: { landingPages: number | null; products: number | null };
  /** What the button of this plan's card does. */
  action: "current" | "upgrade" | "renew" | "included";
}

export interface BillingOverview {
  plan: PlanKey;
  /** End of the paid period, ISO; `null` on Starter. */
  periodEnd: string | null;
  /** A paid plan that ran out (the store is back on Starter). */
  lapsedPlan: PaidPlan | null;
  usage: {
    landingPages: { used: number; limit: number | null };
    products: { used: number; limit: number | null };
  };
  plans: PublicPlan[];
  invoices: PublicInvoice[];
  /** Test mode: payments are simulated and nothing is really charged. */
  sandbox: boolean;
}

export interface UpgradeSession {
  sessionId: string;
  plan: PaidPlan;
  /** Minor units. */
  amount: number;
}
