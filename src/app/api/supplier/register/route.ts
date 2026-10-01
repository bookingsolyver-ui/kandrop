import { signSession } from "@/server/auth/jwt";
import { setSessionCookie } from "@/server/auth/session";
import { attemptLimiter, clientIp } from "@/server/http/rateLimit";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { registerSupplier } from "@/server/modules/supplier/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// At most 10 sign-up attempts per IP per 15 minutes (every attempt counts).
const perIp = attemptLimiter({ max: 10, windowMs: 15 * 60 * 1000 });

/** Creates the supplier account (Supabase Auth + `suppliers` row) and signs it in. */
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const key = `supplier-register:${clientIp(req)}`;
  perIp.assertAllowed(key);
  perIp.recordFailure(key);

  const supplier = await registerSupplier(await readJson(req));
  const { token, expiresAt } = await signSession({ userId: supplier.id, storeId: "supplier", role: "supplier" });
  await setSessionCookie(token, expiresAt);
  return json({ ok: true }, { status: 201 });
});
