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
  // Aliases and extras read by the order page (`orderPaymentInfo`): the bank's name and the holder under the
  // names used on the host, and the BIC/SWIFT code (shown when set).
  BANK_TRANSFER_BANK_NAME: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().optional()),
  BANK_TRANSFER_ACCOUNT_NAME: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().optional()),
  BANK_TRANSFER_BIC_SWIFT: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().optional()),
  SUPPORT_WHATSAPP: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  // The support inbox shown on the Support page (the WhatsApp number is `SUPPORT_WHATSAPP`, shared with
  // the bank-transfer proofs). Both fall back to the values in `support/contacts.ts`.
  SUPPORT_EMAIL: z.preprocess((v) => (v === "" ? undefined : v), z.email().optional()),
  // Transactional e-mail (order confirmation to the customer). Unset RESEND_API_KEY = no e-mail is sent, nothing else changes.
  RESEND_API_KEY: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().optional()),
  // The sender, on a domain verified in Resend, e.g. `Kandrop <encomendas@kandrop.com>`. Unset = Resend's test sender.
  EMAIL_FROM: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().max(200).optional()),
  // Web Push (browser notifications). Generate the pair with `npx web-push generate-vapid-keys`. Without the pair the
  // feature is simply off. NEXT_PUBLIC_VAPID_PUBLIC_KEY is the same public key, for the browser.
  VAPID_PUBLIC_KEY: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().optional()),
  VAPID_PRIVATE_KEY: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().optional()),
  VAPID_SUBJECT: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().optional()),
  // External alerts. Both are optional and independent; each is a URL that accepts a JSON POST.
  ADMIN_TELEGRAM_WEBHOOK: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.url().optional()),
  ADMIN_TELEGRAM_CHAT_ID: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().optional()),
  WHATSAPP_API_URL: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.url().optional()),
  WHATSAPP_API_TOKEN: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().optional()),
  // Who may open `/admin`: a comma-separated list of account e-mails. Empty = nobody (the pages answer
  // 404), so the operator console is never open by default.
  ADMIN_EMAILS: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  // Bearer token for `POST /api/admin/transfers/:reference/confirm` (a person at Kandrop confirming
  // a transfer arrived). Unset = that endpoint does not exist.
  ADMIN_API_TOKEN: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(32).optional()),
  // AES-256 key (32 random bytes, base64: `openssl rand -base64 32`) for IBANs and tax numbers at rest.
  // Unset = stored unencrypted, with a warning (see `crypto/field.ts`).
  DATA_ENCRYPTION_KEY: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  // The public address links are built on (`https://www.kandrop.com`): used for the promotion links the merchant
  // copies. Unset = the address the merchant is browsing on.
  PUBLIC_SITE_URL: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.url().optional().catch(undefined)),
  // Kandrop's commission, in basis points of the merchant's gross margin (sale price − the supplier's cost):
  // 1000 = 10%. A BUSINESS decision: set it deliberately; the default is only a placeholder.
  COMMISSION_BPS: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().min(0).max(10_000).default(1000).catch(1000)),
  // `sandbox` simulates every payment. `live` needs a real provider integration (none yet).
  PAYMENTS_MODE: z.enum(["sandbox", "live"]).default("sandbox"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/**
 * One malformed OPTIONAL variable (a placeholder like `<TOKEN>` left in a URL, a typo in an e-mail) must never take the
 * whole site down: it used to throw on the first request of EVERY page, which the browser shows as a React 441 crash.
 * Invalid values are ignored (so the feature they configure stays off or on its default) and their NAMES are logged
 * loudly (never the values). A missing or invalid REQUIRED value still fails: the checks below the parse enforce those.
 */
function parseTolerant(source: NodeJS.ProcessEnv): Env {
  const first = schema.safeParse(source);
  if (first.success) return first.data;
  const bad = [...new Set(first.error.issues.map((issue) => String(issue.path[0] ?? "")))].filter(Boolean);
  console.error(`[env] IGNORING invalid environment variables (fix them in the host settings): ${bad.join(", ")}`);
  const cleaned: NodeJS.ProcessEnv = { ...source };
  for (const key of bad) delete cleaned[key];
  return schema.parse(cleaned);
}

/**
 * Validated lazily (first request, not module import) so `next build` — which loads route
 * modules without runtime secrets — does not fail. Production misconfiguration still fails
 * fast on the first request.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = parseTolerant(process.env);
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
