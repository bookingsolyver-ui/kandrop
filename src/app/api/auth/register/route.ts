import { signSession } from "@/server/auth/jwt";
import { setSessionCookie } from "@/server/auth/session";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { subscriptionStateOf } from "@/server/auth/access";
import { registerUser, toMe, toSession } from "@/server/modules/auth/service";
import type { RegisterInput } from "@/shared/auth/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Creates the account + store, then signs the user in (JWT in an httpOnly cookie). */
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const user = await registerUser((await readJson(req)) as RegisterInput);

  const session = toSession(user);
  const { token, expiresAt } = await signSession(session);
  await setSessionCookie(token, expiresAt);

  // A new account has paid nothing: `subscription` is "pending" and the form sends it to /checkout.
  return json({ user: toMe(user), subscription: subscriptionStateOf(session) }, { status: 201 });
});
