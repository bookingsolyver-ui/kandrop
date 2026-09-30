import { ApiError } from "@/server/http/errors";
import { assertSameOrigin, handle, json } from "@/server/http/respond";
import { simulatePaymentSuccess } from "@/server/modules/payments/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * DEVELOPMENT SHORTCUT (sandbox only, never in production): confirms a pending payment at once, so
 * the checkout can be tested without approving it in Multicaixa Express. Answers 404 anywhere else.
 */
export const POST = handle(async (req, ctx: Ctx) => {
  assertSameOrigin(req);
  const payment = await simulatePaymentSuccess((await ctx.params).id);
  if (!payment) throw new ApiError("not_found");
  return json(payment, { headers: { "Cache-Control": "no-store" } });
});
