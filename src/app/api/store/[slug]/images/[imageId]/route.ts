import { handle } from "@/server/http/respond";
import { getStorefrontImage } from "@/server/modules/storefront/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string; imageId: string }> };

/** A product image for shoppers (no login). Only for active products. Ids change with content. */
export const GET = handle(async (_req, ctx: Ctx) => {
  const { slug, imageId } = await ctx.params;
  const image = getStorefrontImage(slug, imageId);
  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
