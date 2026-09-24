import { requireSession } from "@/server/auth/session";
import { handle, json } from "@/server/http/respond";
import { getDashboardSummary } from "@/server/modules/dashboard/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Snapshot for first paint / fallback. Live updates arrive via /api/dashboard/stream. */
export const GET = handle(async (req) => {
  const session = await requireSession(req);
  return json(await getDashboardSummary(session.storeId));
});
