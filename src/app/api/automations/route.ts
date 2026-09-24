import { requireSession } from "@/server/auth/session";
import { handle, json } from "@/server/http/respond";
import { getAutomations } from "@/server/modules/automations/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The WhatsApp connection and the three automation flows of the store. */
export const GET = handle(async (req) => {
  const auth = await requireSession(req);
  return json(await getAutomations(auth), { headers: { "Cache-Control": "no-store" } });
});
