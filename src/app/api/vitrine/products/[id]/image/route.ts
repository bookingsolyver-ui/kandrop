import { requireSession } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";
import { handle } from "@/server/http/respond";
import { approvedImage } from "@/server/modules/vitrine/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The photo of an APPROVED supplier product, for signed-in (paying) merchants. Private cache only. */
export const GET = handle(async (req, ctx: { params: Promise<{ id: string }> }) => {
  await requireSession(req);
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError("not_found");
  const image = await approvedImage(id);
  if (!image) throw new ApiError("not_found");
  return new Response(new Uint8Array(image.data), {
    headers: { "Content-Type": image.mime, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" },
  });
});
