import { requireSession } from "@/server/auth/session";
import { handle, json } from "@/server/http/respond";
import { getPlan } from "@/server/modules/plan/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The store's plan and how much of it is used (drives the sidebar's plan card). */
export const GET = handle(async (req) => {
  const auth = await requireSession(req);
  return json(await getPlan(auth), { headers: { "Cache-Control": "no-store" } });
});
