import { requireSession } from "@/server/auth/session";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { getOrder, updateOrderStatus } from "@/server/modules/orders/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const noStore = { headers: { "Cache-Control": "no-store" } };

export const GET = handle(async (req, ctx: Ctx) => {
  const auth = await requireSession(req);
  return json(await getOrder(auth, (await ctx.params).id), noStore);
});

/** Fulfilment: `{ status, trackingCode? }`. Only the next step (or a cancellation) is accepted. */
export const PATCH = handle(async (req, ctx: Ctx) => {
  assertSameOrigin(req);
  const auth = await requireSession(req);
  const body = await readJson(req, 10_000);
  return json(await updateOrderStatus(auth, (await ctx.params).id, body), noStore);
});
