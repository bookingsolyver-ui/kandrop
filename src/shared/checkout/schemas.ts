import { z } from "zod";

/**
 * Checkout validation shared by the browser (instant feedback) and the API (the real gate).
 * Messages are stable CODES; the UI translates `Checkout.validation.<code>`.
 */
export type CheckoutValidationCode =
  | "phone_required"
  | "phone_invalid"
  | "card_number_required"
  | "card_number_invalid"
  | "card_expiry_required"
  | "card_expiry_invalid"
  | "card_expired"
  | "card_cvc_invalid"
  | "card_name_required";

export const PAYMENT_METHODS = ["multicaixa_express", "unitel_money", "card"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const MOBILE_METHODS = ["multicaixa_express", "unitel_money"] as const;
export type MobileMethod = (typeof MOBILE_METHODS)[number];
export const isMobileMethod = (m: PaymentMethod): m is MobileMethod =>
  (MOBILE_METHODS as readonly string[]).includes(m);

const c = (code: CheckoutValidationCode) => ({ error: code });

// ── Angolan mobile numbers ────────────────────────────────────────────────────────────────

/** Keeps digits and drops a leading country code (`+244`, `00244`, `244`) → national digits. */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00244")) digits = digits.slice(5);
  else if (digits.startsWith("244") && digits.length > 9) digits = digits.slice(3);
  return digits;
}

/** 9 digits, starting with 9 — the Angolan mobile format. */
export const isAngolanMobile = (digits: string) => /^9\d{8}$/.test(digits);

export const phoneSchema = z
  .string(c("phone_required"))
  .trim()
  .min(1, c("phone_required"))
  .transform(normalizePhone)
  .pipe(z.string().regex(/^9\d{8}$/, c("phone_invalid")));

// ── Cards ─────────────────────────────────────────────────────────────────────────────────

export type CardBrand = "visa" | "mastercard" | "amex" | "unknown";

export function cardBrand(digits: string): CardBrand {
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  return "unknown";
}

export function luhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return digits.length > 0 && sum % 10 === 0;
}

/** `MM/YY` (or `MMYY`) → month/year, or `null` when the shape or month is impossible. */
export function parseExpiry(value: string): { month: number; year: number } | null {
  const m = value.replace(/\s/g, "").match(/^(\d{2})\/?(\d{2})$/);
  if (!m) return null;
  const month = Number(m[1]);
  if (month < 1 || month > 12) return null;
  return { month, year: 2000 + Number(m[2]) };
}

/** A card is valid through the last day of its expiry month. */
export function isExpired({ month, year }: { month: number; year: number }, now = new Date()) {
  return (
    year < now.getUTCFullYear() || (year === now.getUTCFullYear() && month < now.getUTCMonth() + 1)
  );
}

export const cardSchema = z.object({
  number: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(
      z
        .string()
        .min(1, c("card_number_required"))
        .refine((v) => v.length >= 13 && v.length <= 19 && luhn(v), c("card_number_invalid"))
    ),
  expiry: z
    .string()
    .trim()
    .min(1, c("card_expiry_required"))
    .superRefine((value, ctx) => {
      const parsed = parseExpiry(value);
      if (!parsed) ctx.addIssue({ code: "custom", message: "card_expiry_invalid" });
      else if (isExpired(parsed)) ctx.addIssue({ code: "custom", message: "card_expired" });
    }),
  cvc: z.string().regex(/^\d{3,4}$/, c("card_cvc_invalid")),
  name: z.string().trim().min(2, c("card_name_required")).max(60, c("card_name_required")),
});

// ── Requests ──────────────────────────────────────────────────────────────────────────────

const sessionId = z.string().regex(/^chk_[A-Za-z0-9_-]{16,64}$/);

export const paymentRequestSchema = z.discriminatedUnion("method", [
  z.object({ sessionId, method: z.literal("multicaixa_express"), phone: phoneSchema }),
  z.object({ sessionId, method: z.literal("unitel_money"), phone: phoneSchema }),
  z.object({ sessionId, method: z.literal("card"), card: cardSchema }),
]);

export type PaymentRequest = z.output<typeof paymentRequestSchema>;
export type PaymentRequestInput = z.input<typeof paymentRequestSchema>;

/** First error code per field, for forms that show one message per input. */
export function firstError(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>
): Record<string, CheckoutValidationCode> {
  const out: Record<string, CheckoutValidationCode> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !(field in out)) out[field] = issue.message as CheckoutValidationCode;
  }
  return out;
}

// ── Creating a checkout (merchant side) ───────────────────────────────────────────────────

export const createCheckoutSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        quantity: z.number().int().min(1).max(99),
        /** Unit price in minor units (cêntimos). */
        unitAmount: z.number().int().min(1).max(1_000_000_000),
      })
    )
    .min(1)
    .max(50),
  shippingAmount: z.number().int().min(0).max(1_000_000_000).default(0),
});
export type CreateCheckoutInput = z.input<typeof createCheckoutSchema>;
