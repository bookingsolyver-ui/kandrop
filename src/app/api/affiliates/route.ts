import { requireSession } from "@/server/auth/session";
import { getEnv } from "@/server/config/env";
import { handle, json } from "@/server/http/respond";
import { getAffiliates } from "@/server/modules/affiliates/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The store's affiliate link, KPIs and referrals (`?page=&pageSize=`). Owner only. */
export const GET = handle(async (req) => {
  const auth = await requireSession(req);
  const url = new URL(req.url);
  const query = Object.fromEntries([...url.searchParams].filter(([, value]) => value !== ""));
  const overview = await getAffiliates(auth, query, getEnv().APP_URL ?? url.origin);
  return json(overview, { headers: { "Cache-Control": "no-store" } });
});
