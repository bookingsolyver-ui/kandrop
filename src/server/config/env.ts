import { z } from "zod";

const boolean = z.enum(["true", "false"]).default("false").transform((v) => v === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // An empty value in .env files means "unset".
  SESSION_SECRET: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(32).optional()),
  AUTH_DEV_BYPASS: boolean,
  KANDROP_DEMO_EVENTS: boolean,
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
  }
  return (cached = parsed);
}
