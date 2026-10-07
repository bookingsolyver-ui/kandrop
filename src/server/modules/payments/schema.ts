import "server-only";
import type { PaymentMethod } from "@/shared/checkout/schemas";

/**
 * `pending`   — waiting for the payer to confirm on their phone (Multicaixa Express / Unitel Money)
 * `success`   — paid
 * `failed`    — refused (see `failureCode`)
 * `cancelled` — the payer abandoned a pending payment
 */
export type PaymentStatus = "pending" | "success" | "failed" | "cancelled";

export type FailureCode =
  | "declined_by_customer"
  | "insufficient_funds"
  | "card_declined"
  | "cancelled"
  /** The provider never answered. */
  | "timeout";

export interface PaymentRecord {
  id: string;
  /** Human-friendly reference the buyer can quote to the merchant. */
  reference: string;
  sessionId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  currency: "AOA";
  failureCode?: FailureCode;
  /** Masked destination only (`+244 9•• ••• 789` / `•••• 4242`). Full card data is never kept. */
  target: string;
  createdAt: number;
  paidAt?: number;
  /** Provider transaction id (Multicaixa: `MCX-…`). Internal: the webhook finds the payment by it. */
  providerRef?: string;
  /** For `pending` payments answered by polling (Unitel Money): when the simulator will answer. */
  /** Who paid, as typed at the checkout (mobile money and reference payments). Personal data: never logged, never sent to the browser. */
  payerName?: string;
  payerEmail?: string;
  /** "Pay by reference": what the payer must do (entity, reference, deadline…), as the provider gave it. Flat strings. */
  instructions?: Record<string, string>;
  settle?: { at: number; status: "success" | "failed"; failureCode?: FailureCode };
}

export interface PublicPayment {
  id: string;
  reference: string;
  sessionId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: { amount: number; currency: "AOA" };
  failureCode?: FailureCode;
  target: string;
  createdAt: string;
  paidAt?: string;
  /** Pay-by-reference details to show the payer while the payment is pending. */
  instructions?: Record<string, string>;
}
