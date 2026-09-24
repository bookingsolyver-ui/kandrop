/**
 * The API never returns human-readable text. It returns a stable machine `code`
 * and the client translates it via the `Errors.<code>` message namespace.
 */
export type ApiErrorCode =
  | "unauthenticated"
  | "invalid_credentials"
  | "forbidden"
  | "not_found"
  | "email_taken"
  | "checkout_expired"
  | "checkout_paid"
  | "invalid_transition"
  | "no_bank_account"
  | "insufficient_balance"
  | "payout_pending"
  | "plan_limit_reached"
  | "whatsapp_not_connected"
  | "whatsapp_already_connected"
  | "no_courier_available"
  | "order_not_dispatchable"
  | "delivery_exists"
  | "out_of_stock"
  | "plan_not_upgradable"
  | "lesson_locked"
  | "payments_unavailable"
  | "validation_failed"
  | "payload_too_large"
  | "rate_limited"
  | "internal";

const STATUS: Record<ApiErrorCode, number> = {
  unauthenticated: 401,
  invalid_credentials: 401,
  forbidden: 403,
  not_found: 404,
  email_taken: 409,
  checkout_expired: 410,
  checkout_paid: 409,
  invalid_transition: 409,
  no_bank_account: 409,
  insufficient_balance: 409,
  payout_pending: 409,
  plan_limit_reached: 403,
  whatsapp_not_connected: 409,
  whatsapp_already_connected: 409,
  no_courier_available: 409,
  order_not_dispatchable: 409,
  delivery_exists: 409,
  out_of_stock: 409,
  plan_not_upgradable: 409,
  lesson_locked: 409,
  payments_unavailable: 503,
  validation_failed: 422,
  payload_too_large: 413,
  rate_limited: 429,
  internal: 500,
};

export class ApiError extends Error {
  readonly status: number;

  constructor(
    readonly code: ApiErrorCode,
    readonly details?: unknown,
    readonly headers?: Record<string, string>
  ) {
    super(code);
    this.status = STATUS[code];
  }
}
