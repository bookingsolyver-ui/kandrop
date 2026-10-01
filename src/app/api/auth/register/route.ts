import { signSession } from "@/server/auth/jwt";
import { setSessionCookie } from "@/server/auth/session";
import { attemptLimiter, clientIp } from "@/server/http/rateLimit";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { subscriptionStateOf } from "@/server/auth/access";
import { registerUser, toMe, toSession } from "@/server/modules/auth/service";
import type { RegisterInput } from "@/shared/auth/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// At most 10 sign-up attempts per IP per 15 minutes (every attempt counts, successful or not).
const perIp = attemptLimiter({ max: 10, windowMs: 15 * 60 * 1000 });

/** Creates the account + store, then signs the user in (JWT in an httpOnly cookie). */
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const key = `register:${clientIp(req)}`;
  perIp.assertAllowed(key);
  perIp.recordFailure(key);
  const user = await registerUser((await readJson(req)) as RegisterInput);

  const session = toSession(user);
  const { token, expiresAt } = await signSession(session);
  await setSessionCookie(token, expiresAt);

  // A new account has paid nothing: `subscription` is "pending" and the form sends it to /checkout.
  return json({ user: toMe(user), subscription: await subscriptionStateOf(session) }, { status: 201 });
});
