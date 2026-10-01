import { z } from "zod";

const boolean = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // An empty value in .env files means "unset".
  SESSION_SECRET: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(32).optional()),
  AUTH_DEV_BYPASS: boolean,
  KANDROP_DEMO_EVENTS: boolean,
  // Public base URL of this app. The simulated Multicaixa provider calls its webhook here, so it
  // is configuration — never derived from the (client-controlled) Host header. Defaults to loopback.
  APP_URL: z.preprocess((v) => (v === "" ? undefined : v), z.url().optional()),
  // Signs the Multicaixa webhook (HMAC-SHA256). Optional in sandbox (a per-process secret is
  // generated); the real provider's secret is required once one is integrated.
  MULTICAIXA_WEBHOOK_SECRET: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().min(32).optional()
  ),
  // Supabase (the database; see src/lib/supabase and supabase/migrations). The two NEXT_PUBLIC_ values are
  // public by design; the service-role key bypasses Row Level Security and must stay server-only.
  NEXT_PUBLIC_SUPABASE_URL: z.preprocess((v) => (v === "" ? undefined : v), z.url().optional()),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().optional()
  ),
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  // Bank transfer as a way to pay a Kandrop plan: WHERE the money goes and who to send the proof to.
  // All four (bank, account, IBAN, WhatsApp) must be set to offer it in production; in sandbox mode a
  // clearly-labelled EXAMPLE is used when they are missing. Never invent bank details: a shopper
  // would send real money to them. Validated in `payments/transfer.ts`, not here, so a typo does not
  // take the whole app down.
  BANK_TRANSFER_BANK: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  BANK_TRANSFER_HOLDER: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  BANK_TRANSFER_ACCOUNT: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  BANK_TRANSFER_IBAN: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  SUPPORT_WHATSAPP: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  // The support inbox shown on the Support page (the WhatsApp number is `SUPPORT_WHATSAPP`, shared with
  // the bank-transfer proofs). Both fall back to the values in `support/contacts.ts`.
  SUPPORT_EMAIL: z.preprocess((v) => (v === "" ? undefined : v), z.email().optional()),
  // Who may open `/admin`: a comma-separated list of account e-mails. Empty = nobody (the pages answer
  // 404), so the operator console is never open by default.
  ADMIN_EMAILS: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  // Bearer token for `POST /api/admin/transfers/:reference/confirm` (a person at Kandrop confirming
  // a transfer arrived). Unset = that endpoint does not exist.
  ADMIN_API_TOKEN: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(32).optional()),
  // AES-256 key (32 random bytes, base64: `openssl rand -base64 32`) for IBANs and tax numbers at rest.
  // Unset = stored unencrypted, with a warning (see `crypto/field.ts`).
  DATA_ENCRYPTION_KEY: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  // Kandrop's commission, in basis points of the merchant's gross margin (sale price − the supplier's cost):
  // 1000 = 10%. A BUSINESS decision: set it deliberately; the default is only a placeholder.
  COMMISSION_BPS: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().min(0).max(10_000).default(1000)),
  // `sandbox` simulates every payment. `live` needs a real provider integration (none yet).
  PAYMENTS_MODE: z.enum(["sandbox", "live"]).default("sandbox"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/**
 * Validated lazily (first request, not module import) so `next build` — which loads route
 * modules without runtime secrets — does not fail. Production misconfiguration still fails
 * fast on the first request.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.parse(process.env);
  if (parsed.NODE_ENV === "production") {
    if (!parsed.SESSION_SECRET) throw new Error("SESSION_SECRET is required in production");
    if (parsed.AUTH_DEV_BYPASS) throw new Error("AUTH_DEV_BYPASS must be off in production");
    // Not fatal (a demo deployment is legitimate) but never silent: real merchants would see it.
    if (parsed.PAYMENTS_MODE === "sandbox") {
      console.warn(
        "[env] PAYMENTS_MODE=sandbox in production: payments are SIMULATED, no real money moves"
      );
    }
    if (parsed.KANDROP_DEMO_EVENTS) {
      console.warn(
        "[env] KANDROP_DEMO_EVENTS=true in production: demo data is seeded into every store"
      );
    }
  }
  return (cached = parsed);
}
