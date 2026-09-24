import { requireSession } from "@/server/auth/session";
import { handle } from "@/server/http/respond";
import { getProductImage } from "@/server/modules/products/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; imageId: string }> };

/**
 * Serves a product image to its own merchant. Image ids are unique per upload, so a given URL
 * never changes content and can be cached; `nosniff` stops a browser guessing another type.
 */
export const GET = handle(async (req, ctx: Ctx) => {
  const auth = await requireSession(req);
  const { id, imageId } = await ctx.params;
  const image = await getProductImage(auth, id, imageId);
  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
