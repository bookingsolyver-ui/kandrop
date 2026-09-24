import { requireSession } from "@/server/auth/session";
import { handle, json } from "@/server/http/respond";
import { getDelivery } from "@/server/modules/logistics/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** One delivery of the store, as it is right now (with its proof once delivered). */
export const GET = handle(async (req, ctx: Ctx) => {
  const auth = await requireSession(req);
  return json(await getDelivery(auth, (await ctx.params).id), {
    headers: { "Cache-Control": "no-store" },
  });
});
