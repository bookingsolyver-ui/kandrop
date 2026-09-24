import { attemptLimiter, clientIp } from "@/server/http/rateLimit";
import { assertSameOrigin, handle } from "@/server/http/respond";
import { recordView } from "@/server/modules/storefront/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };
const BOTS = /bot|crawl|spider|slurp|preview|headless|lighthouse/i;
const limiter = attemptLimiter({ max: 60, windowMs: 60_000 });

/**
 * The page announces it has been opened (once per browser session, from the browser, so most
 * crawlers never run it). Answers 204 whatever happens: it is analytics, not a feature.
 */
export const POST = handle(async (req, ctx: Ctx) => {
  assertSameOrigin(req);
  const key = `view:${clientIp(req)}`;
  limiter.assertAllowed(key);
  limiter.recordFailure(key); // counts requests here, not failures
  if (!BOTS.test(req.headers.get("user-agent") ?? "")) recordView((await ctx.params).slug);
  return new Response(null, { status: 204 });
});
