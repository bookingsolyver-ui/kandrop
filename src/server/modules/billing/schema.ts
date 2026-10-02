import type { TransferInfo } from "@/server/modules/payments/transfer";
import type { PlanKey } from "@/server/modules/plan/limits";
import type { InvoiceStatus, PaidPlan } from "@/shared/billing/schemas";

/** A store's paid period. Outside it the store is on Starter (see `plan.ts`). */
export interface SubscriptionRecord {
  storeId: string;
  plan: PaidPlan;
  /** Epoch ms. */
  periodEnd: number;
  /** Epoch ms of the first payment; `null` for rows that predate the cycle columns. */
  startedAt: number | null;
  /** 30-day periods paid so far. 1 = still in the launch month; the next one is billed at the regular price. */
  periodsPaid: number;
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
  /** Minor units: the regular monthly price, shown next to a launch `price`. */
  regularPrice: number;
  /** `price` is the launch price of the first month. */
  intro: boolean;
  /** What the button of this plan's card does. */
  action: "current" | "upgrade" | "renew" | "included";
}

export interface BillingOverview {
  plan: PlanKey;
  /** End of the paid period, ISO. */
  periodEnd: string;
  usage: {
    landingPages: { used: number; limit: number | null };
    products: { used: number; limit: number | null };
  };
  plans: PublicPlan[];
  /** Cycle of the current subscription: what the next renewal costs. */
  cycle: { periodsPaid: number; firstMonth: boolean; renewalPrice: number };
  invoices: PublicInvoice[];
  /** Test mode: payments are simulated and nothing is really charged. */
  sandbox: boolean;
}

export interface UpgradeSession {
  sessionId: string;
  plan: PaidPlan;
  /** Minor units. */
  amount: number;
  /** Minor units: what the next renewal costs (the regular price). */
  renewalAmount: number;
  /** `amount` is the launch price of the first month. */
  intro: boolean;
  /** Where to send a bank transfer instead, or `null` when transfers are not offered. */
  transfer: TransferInfo | null;
}
