import { z } from "zod";
import { attemptLimiter, clientIp } from "@/server/http/rateLimit";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { previewStorefrontCoupon } from "@/server/modules/storefront/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };
// Every call counts: a guessing run over coupon codes is slowed down to a crawl.
const limiter = attemptLimiter({ max: 15, windowMs: 60_000 });

/** The live preview behind the checkout's "Aplicar": `{ discount, total }` in minor units, or 422 `coupon_unavailable`. */
export const POST = handle(async (req, ctx: Ctx) => {
  assertSameOrigin(req);
  const key = `coupon:${clientIp(req)}`;
  limiter.assertAllowed(key);
  limiter.recordFailure(key);
  const { slug } = await ctx.params;
  const { code } = z.object({ code: z.string().trim().max(40) }).parse(await readJson(req, 500));
  return json(await previewStorefrontCoupon(slug, code), { headers: { "Cache-Control": "no-store" } });
});
