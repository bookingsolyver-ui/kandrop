import { signSession } from "@/server/auth/jwt";
import { setSessionCookie } from "@/server/auth/session";
import { attemptLimiter, clientIp } from "@/server/http/rateLimit";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { ApiError } from "@/server/http/errors";
import { subscriptionStateOf } from "@/server/auth/access";
import { authenticate, toMe, toSession } from "@/server/modules/auth/service";
import type { LoginInput } from "@/shared/auth/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 5 failed attempts per (IP, e-mail) and 20 per IP, per 15 minutes.
const WINDOW_MS = 15 * 60 * 1000;
const perAccount = attemptLimiter({ max: 5, windowMs: WINDOW_MS });
const perIp = attemptLimiter({ max: 20, windowMs: WINDOW_MS });

export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const body = (await readJson(req)) as LoginInput;

  const ip = clientIp(req);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const accountKey = `login:${ip}:${email}`;
  const ipKey = `login-ip:${ip}`;
  perAccount.assertAllowed(accountKey);
  perIp.assertAllowed(ipKey);

  try {
    const user = await authenticate(body);
    perAccount.reset(accountKey);

    const session = toSession(user);
    const { token, expiresAt } = await signSession(session);
    await setSessionCookie(token, expiresAt);
    // `pending` = nothing paid yet: the browser goes to /checkout instead of the dashboard.
    return json({ user: toMe(user), subscription: subscriptionStateOf(session) });
  } catch (err) {
    // Only credential failures count; malformed input is rejected before it costs anything.
    if (err instanceof ApiError && err.code === "invalid_credentials") {
      perAccount.recordFailure(accountKey);
      perIp.recordFailure(ipKey);
    }
    throw err;
  }
});
