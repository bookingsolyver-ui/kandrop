import { ApiError } from "./errors";

interface Bucket {
  failures: number;
  resetAt: number;
}

const g = globalThis as unknown as { __kandropLimiter?: Map<string, Bucket> };
const buckets = (g.__kandropLimiter ??= new Map<string, Bucket>());

/**
 * In-memory failed-attempt limiter (per process). Swap for Redis before running more than
 * one instance — the call sites stay identical.
 */
export function attemptLimiter(opts: { max: number; windowMs: number }) {
  const live = (key: string): Bucket | undefined => {
    const bucket = buckets.get(key);
    if (bucket && bucket.resetAt <= Date.now()) {
      buckets.delete(key);
      return undefined;
    }
    return bucket;
  };

  return {
    /** Throws `rate_limited` (with `Retry-After`) if the key is already locked out. */
    assertAllowed(key: string) {
      const bucket = live(key);
      if (bucket && bucket.failures >= opts.max) {
        const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000));
        throw new ApiError("rate_limited", { retryAfter }, { "Retry-After": String(retryAfter) });
      }
    },
    recordFailure(key: string) {
      const bucket = live(key) ?? { failures: 0, resetAt: Date.now() + opts.windowMs };
      bucket.failures += 1;
      buckets.set(key, bucket);
    },
    reset(key: string) {
      buckets.delete(key);
    },
  };
}

/** Best-effort client IP. Only trustworthy behind a proxy that overwrites X-Forwarded-For. */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
