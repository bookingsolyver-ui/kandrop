import { ApiError } from "@/server/http/errors";
import { handle, json } from "@/server/http/respond";
import { getPublicCheckout } from "@/server/modules/checkout/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public (the buyer is not signed in). The unguessable session id is the capability. */
export const GET = handle(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const checkout = getPublicCheckout(id);
  if (!checkout) throw new ApiError("not_found");
  return json(checkout, { headers: { "Cache-Control": "no-store" } });
});
