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
  // Supabase (optional: nothing uses it yet, see src/lib/supabase). The two NEXT_PUBLIC_ values are
  // public by design; the service-role key bypasses Row Level Security and must stay server-only.
  NEXT_PUBLIC_SUPABASE_URL: z.preprocess((v) => (v === "" ? undefined : v), z.url().optional()),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().optional()
  ),
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
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
