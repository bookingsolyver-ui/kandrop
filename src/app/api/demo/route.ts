import { requireSession } from "@/server/auth/session";
import { assertSameOrigin, handle, json } from "@/server/http/respond";
import { enableDemoData } from "@/server/modules/store/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** "Load demo data" for the signed-in store (owner only). Sample data, clearly flagged as such. */
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  await enableDemoData(await requireSession(req));
  return json({ demo: true }, { headers: { "Cache-Control": "no-store" } });
});
