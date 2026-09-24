import { requireSession } from "@/server/auth/session";
import { handle, json } from "@/server/http/respond";
import { getStore } from "@/server/modules/store/service";

export const runtime = "nodejs";

export const GET = handle(async (req) => {
  const session = await requireSession(req);
  return json(await getStore(session));
});
