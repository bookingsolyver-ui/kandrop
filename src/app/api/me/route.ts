import { requireSession } from "@/server/auth/session";
import { handle, json } from "@/server/http/respond";
import { getMe } from "@/server/modules/auth/service";

export const runtime = "nodejs";
// Depends on WHO is signed in: never prerendered, never cached.
export const dynamic = "force-dynamic";

export const GET = handle(async (req) => {
  const session = await requireSession(req, { allowUnpaid: true });
  return json(await getMe(session));
});
