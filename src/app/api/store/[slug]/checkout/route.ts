import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { ApiError } from "@/server/http/errors";
import { attemptLimiter, clientIp } from "@/server/http/rateLimit";
import { assertSameOrigin, handle } from "@/server/http/respond";
import { createStorefrontCheckout } from "@/server/modules/storefront/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };
const limiter = attemptLimiter({ max: 20, windowMs: 60_000 });

/**
 * The "Buy now" button is a plain HTML form (it works before any JavaScript arrives, which
 * matters on slow phones). It creates the checkout session and sends the shopper straight
 * there. If the product just sold out, it goes back to the page, which then says so.
 */
export const POST = handle(async (req, ctx: Ctx) => {
  assertSameOrigin(req);
  const key = `buy:${clientIp(req)}`;
  limiter.assertAllowed(key);
  limiter.recordFailure(key);

  const { slug } = await ctx.params;
  const field = (await req.formData()).get("locale");
  const locale = typeof field === "string" && hasLocale(routing.locales, field) ? field : "pt";
  try {
    const session = await createStorefrontCheckout(slug);
    return Response.redirect(new URL(`/${locale}/checkout?session=${session}`, req.url), 303);
  } catch (error) {
    if (error instanceof ApiError && error.code === "out_of_stock") {
      return Response.redirect(new URL(`/${locale}/loja/${slug}`, req.url), 303);
    }
    throw error;
  }
});
