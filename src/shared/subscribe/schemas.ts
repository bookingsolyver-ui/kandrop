import { z } from "zod";
import { emailSchema, evaluatePassword, PASSWORD_MAX, PASSWORD_MIN } from "@/shared/auth/schemas";
import { phoneSchema } from "@/shared/checkout/schemas";

/**
 * The public subscription funnel (`/checkout`, no session): choose a plan, give your details, pay.
 *
 * !! PLACEHOLDER PRICING !! 14.999 Kz and 34.999 Kz are the figures requested for this flow; they
 * do NOT match the plan catalogue of the billing page and the landing page (Starter free, Growth,
 * Scale in `plan/limits.ts`). Reconcile the two before any of it is real. EUR and USD amounts are
 * derived at a fixed REFERENCE rate: they are indicative, not what a card processor would charge.
 */
export const SIGNUP_PLANS = ["starter", "pro"] as const;
export type SignupPlan = (typeof SIGNUP_PLANS)[number];

export const CURRENCIES = ["AOA", "EUR", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Whole Kwanzas per month. */
export const PLAN_PRICE_KZ: Record<SignupPlan, number> = { starter: 14_999, pro: 34_999 };

/** Kwanzas per 1 unit of the currency (reference values, not live rates). */
export const REFERENCE_RATE: Record<Exclude<Currency, "AOA">, number> = { EUR: 1_050, USD: 920 };

/** Price in minor units (cêntimos / cents), integer, in the chosen currency. */
export function priceMinor(plan: SignupPlan, currency: Currency): number {
  const kz = PLAN_PRICE_KZ[plan];
  return currency === "AOA" ? kz * 100 : Math.round((kz / REFERENCE_RATE[currency]) * 100);
}

/** Kwanzas are the only currency with a local method (Multicaixa, bank transfer); the rest is card. */
export const isLocalCurrency = (currency: Currency) => currency === "AOA";

/** The 21 provinces of Angola (proper names: not translated). */
export const PROVINCES = [
  "Bengo",
  "Benguela",
  "Bié",
  "Cabinda",
  "Cuando",
  "Cubango",
  "Cuanza Norte",
  "Cuanza Sul",
  "Cunene",
  "Huambo",
  "Huíla",
  "Icolo e Bengo",
  "Luanda",
  "Lunda Norte",
  "Lunda Sul",
  "Malanje",
  "Moxico",
  "Moxico Leste",
  "Namibe",
  "Uíge",
  "Zaire",
] as const;

/** Messages are stable CODES; the UI translates `Subscribe.validation.<code>`. */
export type DetailsCode =
  | "name_required"
  | "name_too_short"
  | "email_required"
  | "email_invalid"
  | "phone_required"
  | "phone_invalid"
  | "password_required"
  | "password_too_short"
  | "password_too_long"
  | "password_needs_letter_number"
  | "password_too_common"
  | "password_contains_email"
  | "province_required";

const c = (code: DetailsCode) => ({ error: code });

export const detailsSchema = z
  .object({
    fullName: z
      .string(c("name_required"))
      .trim()
      .min(1, c("name_required"))
      .min(2, c("name_too_short"))
      .max(80, c("name_too_short")),
    // The same rules as sign-up, so a valid funnel entry is a valid account later.
    email: emailSchema,
    whatsapp: phoneSchema,
    password: z
      .string(c("password_required"))
      .min(1, c("password_required"))
      .min(PASSWORD_MIN, c("password_too_short"))
      .max(PASSWORD_MAX, c("password_too_long")),
    province: z.enum(PROVINCES, c("province_required")),
  })
  .superRefine((value, ctx) => {
    if (value.password.length < PASSWORD_MIN) return;
    const checks = evaluatePassword(value.password, value.email);
    const add = (message: DetailsCode) =>
      ctx.addIssue({ code: "custom", message, path: ["password"] });
    if (!checks.letterAndNumber) add("password_needs_letter_number");
    else if (!checks.notCommon) add("password_too_common");
    else if (!checks.notEmail) add("password_contains_email");
  });

export type DetailsField = "fullName" | "email" | "whatsapp" | "password" | "province";

/** First error code per field, for one clear message under each input. */
export function detailsErrors(
  values: Record<DetailsField, string>
): Partial<Record<DetailsField, DetailsCode>> {
  const parsed = detailsSchema.safeParse(values);
  if (parsed.success) return {};
  const out: Partial<Record<DetailsField, DetailsCode>> = {};
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0]) as DetailsField;
    if (!(field in out)) out[field] = issue.message as DetailsCode;
  }
  return out;
}

// ── Bank-transfer proof ───────────────────────────────────────────────────────────────────

export const PROOF_MAX_BYTES = 5 * 1024 * 1024;
export const PROOF_TYPES = ["image/jpeg", "image/png", "application/pdf"] as const;
export type ProofCode = "proof_required" | "proof_type" | "proof_too_large";

/** The rules for the transfer receipt (checked in the browser; nothing is uploaded in this prototype). */
export function proofError(file: { type: string; size: number } | null): ProofCode | null {
  if (!file) return "proof_required";
  if (!(PROOF_TYPES as readonly string[]).includes(file.type)) return "proof_type";
  if (file.size > PROOF_MAX_BYTES) return "proof_too_large";
  return null;
}

/** A fictional account, clearly marked as an example wherever it is shown. */
export const EXAMPLE_IBAN = "AO06000000000000000000000";
export const formatIban = (iban: string) => iban.replace(/(.{4})/g, "$1 ").trim();
