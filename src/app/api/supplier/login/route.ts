import { signSession } from "@/server/auth/jwt";
import { setSessionCookie } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";
import { attemptLimiter, clientIp } from "@/server/http/rateLimit";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { authenticateSupplier } from "@/server/modules/supplier/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 5 failed attempts per (IP, e-mail) and 20 per IP, per 15 minutes: same limits as the merchant login.
const WINDOW_MS = 15 * 60 * 1000;
const perAccount = attemptLimiter({ max: 5, windowMs: WINDOW_MS });
const perIp = attemptLimiter({ max: 20, windowMs: WINDOW_MS });

export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const body = (await readJson(req)) as { email?: unknown; password?: unknown };
  const ip = clientIp(req);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const accountKey = `supplier-login:${ip}:${email}`;
  const ipKey = `supplier-login-ip:${ip}`;
  perAccount.assertAllowed(accountKey);
  perIp.assertAllowed(ipKey);

  try {
    const supplier = await authenticateSupplier(body?.email, body?.password);
    perAccount.reset(accountKey);
    const { token, expiresAt } = await signSession({ userId: supplier.id, storeId: "supplier", role: "supplier" });
    await setSessionCookie(token, expiresAt);
    return json({ ok: true });
  } catch (err) {
    if (err instanceof ApiError && err.code === "invalid_credentials") {
      perAccount.recordFailure(accountKey);
      perIp.recordFailure(ipKey);
    }
    throw err;
  }
});
