import { requireSession } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";
import { handle, json } from "@/server/http/respond";
import { getOrder } from "@/server/modules/orders/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const noStore = { headers: { "Cache-Control": "no-store" } };

export const GET = handle(async (req, ctx: Ctx) => {
  const auth = await requireSession(req);
  return json(await getOrder(auth, (await ctx.params).id), noStore);
});

/**
 * READ-ONLY for merchants. Moving an order (verifying the payment, collecting, delivering) is Kandrop's job,
 * done from the admin console. Any attempt to change an order with a merchant's token is refused at once (403),
 * whatever the body says.
 */
const refuse = handle(async (req) => {
  await requireSession(req);
  throw new ApiError("forbidden");
});
export const PATCH = refuse;
export const PUT = refuse;
export const POST = refuse;
export const DELETE = refuse;
