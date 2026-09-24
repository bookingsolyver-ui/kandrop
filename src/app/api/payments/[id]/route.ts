import { ApiError } from "@/server/http/errors";
import { assertSameOrigin, handle, json } from "@/server/http/respond";
import { cancelPayment, getPayment } from "@/server/modules/payments/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const noStore = { headers: { "Cache-Control": "no-store" } };

/** Status polling for pending payments. */
export const GET = handle(async (_req, ctx: Ctx) => {
  const payment = getPayment((await ctx.params).id);
  if (!payment) throw new ApiError("not_found");
  return json(payment, noStore);
});

/** The payer gives up on a pending confirmation (e.g. to pick another method). */
export const DELETE = handle(async (req, ctx: Ctx) => {
  assertSameOrigin(req);
  const payment = cancelPayment((await ctx.params).id);
  if (!payment) throw new ApiError("not_found");
  return json(payment, noStore);
});
