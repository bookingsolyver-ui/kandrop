import { requireSession } from "@/server/auth/session";
import { handle, json } from "@/server/http/respond";
import { getMe } from "@/server/modules/auth/service";

export const runtime = "nodejs";

export const GET = handle(async (req) => {
  const session = await requireSession(req, { allowUnpaid: true });
  return json(await getMe(session));
});
