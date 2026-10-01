/**
 * How an ORDER is paid for, apart from how it travels (that is `shared/fulfilment`). Kandrop is the single
 * custodian of the money: the shopper pays Kandrop, Kandrop pays the supplier and the merchant.
 *
 * Payment state of an order:
 *   pending_payment  the order exists; the shopper still has to pay and send the slip to Kandrop's WhatsApp
 *   proof_submitted  the slip arrived (the team may attach a reference or a note)
 *   paid_verified    the team saw the money in Kandrop's account. THE financial trigger: only now may the
 *                    order be marked delivered and the supplier's money become available.
 */
export const ORDER_PAYMENT_STATUSES = ["pending_payment", "proof_submitted", "paid_verified"] as const;
export type OrderPaymentStatus = (typeof ORDER_PAYMENT_STATUSES)[number];

/**
 * WHO verifies the payment (the "provider"):
 *  - `manual_whatsapp_transfer`: cash / bank transfer, verified by a person from the slip sent on WhatsApp.
 *  - `multicaixa_express_api`: the Multicaixa Express integration (to come): its signed webhook calls the very
 *    same `confirmOrderPayment` the admin button calls, so nothing else changes.
 */
export const ORDER_PAYMENT_PROVIDERS = ["manual_whatsapp_transfer", "multicaixa_express_api"] as const;
export type OrderPaymentProvider = (typeof ORDER_PAYMENT_PROVIDERS)[number];
export const DEFAULT_ORDER_PAYMENT_PROVIDER: OrderPaymentProvider = "manual_whatsapp_transfer";

/** Forward only; a verified payment is final (a refund is a separate, future flow). */
export const canMovePayment = (from: OrderPaymentStatus, to: OrderPaymentStatus) =>
  (from === "pending_payment" && (to === "proof_submitted" || to === "paid_verified")) || (from === "proof_submitted" && to === "paid_verified");

/** The golden rule: nothing is delivered, and no supplier money is released, before the payment is verified. */
export const isPaymentVerified = (s: OrderPaymentStatus) => s === "paid_verified";

export const normalizePaymentStatus = (raw: unknown): OrderPaymentStatus =>
  (ORDER_PAYMENT_STATUSES as readonly string[]).includes(String(raw)) ? (raw as OrderPaymentStatus) : "pending_payment";
export const normalizePaymentProvider = (raw: unknown): OrderPaymentProvider =>
  (ORDER_PAYMENT_PROVIDERS as readonly string[]).includes(String(raw)) ? (raw as OrderPaymentProvider) : DEFAULT_ORDER_PAYMENT_PROVIDER;

/** What the team may attach to a payment step: the slip's reference and/or a note. Both optional, both bounded. */
export interface PaymentEvidence {
  reference?: string;
  note?: string;
}
