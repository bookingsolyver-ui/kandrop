import { hasLocale } from "next-intl";
import { ZodError } from "zod";
import { routing } from "@/i18n/routing";
import { ApiError } from "@/server/http/errors";
import { attemptLimiter, clientIp } from "@/server/http/rateLimit";
import { assertSameOrigin, handle } from "@/server/http/respond";
import { placeStorefrontOrder } from "@/server/modules/storefront/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };
const limiter = attemptLimiter({ max: 20, windowMs: 60_000 });

/**
 * The "Buy now" button is a plain HTML form (it works before any JavaScript arrives, which
 * matters on slow phones). It places the order and sends the shopper to its page (how to pay,
 * and where to send the slip). If the product just sold out, or the buyer's details are not valid, it goes back to the
 * page, which then says so.
 */
export const POST = handle(async (req, ctx: Ctx) => {
  assertSameOrigin(req);
  const key = `buy:${clientIp(req)}`;
  limiter.assertAllowed(key);
  limiter.recordFailure(key);

  const { slug } = await ctx.params;
  const form = await req.formData();
  const text = (name: string) => (typeof form.get(name) === "string" ? (form.get(name) as string) : "");
  const field = form.get("locale");
  const locale = typeof field === "string" && hasLocale(routing.locales, field) ? field : "pt";
  try {
    const orderId = await placeStorefrontOrder(slug, {
      name: text("name"), email: text("email"), phone: text("phone"), province: text("province"), city: text("city"), street: text("street"), reference: text("reference"),
      deliveryDate: text("deliveryDate"), coupon: text("coupon"),
    });
    return Response.redirect(new URL(`/${locale}/pedido/${orderId}`, req.url), 303);
  } catch (error) {
    if (error instanceof ApiError && error.code === "out_of_stock") {
      return Response.redirect(new URL(`/${locale}/loja/${slug}`, req.url), 303);
    }
    // The details were not valid (the browser's own checks were bypassed or are not supported): back to the page.
    if (error instanceof ZodError) {
      return Response.redirect(new URL(`/${locale}/checkout/${slug}?error=details`, req.url), 303);
    }
    throw error;
  }
});
