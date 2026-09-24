import { clearSessionCookie } from "@/server/auth/session";
import { assertSameOrigin, handle, json } from "@/server/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handle(async (req) => {
  assertSameOrigin(req);
  await clearSessionCookie();
  return json({ ok: true });
});
