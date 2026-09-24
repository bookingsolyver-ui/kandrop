import { signSession } from "@/server/auth/jwt";
import { setSessionCookie } from "@/server/auth/session";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { registerUser, toMe, toSession } from "@/server/modules/auth/service";
import type { RegisterInput } from "@/shared/auth/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Creates the account + store, then signs the user in (JWT in an httpOnly cookie). */
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const user = await registerUser((await readJson(req)) as RegisterInput);

  const { token, expiresAt } = await signSession(toSession(user));
  await setSessionCookie(token, expiresAt);

  return json({ user: toMe(user) }, { status: 201 });
});
