import { resolveSession } from "@/server/auth/session";
import { SESSION_COOKIE } from "@/server/auth/session";
import { supplierProducts } from "@/server/modules/supplier/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A supplier's own product image. Private: only its owner's session gets bytes, and nothing is shared-cached. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const token = req.headers.get("cookie")?.split(";").map((p) => p.trim()).find((p) => p.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  const session = await resolveSession(token);
  if (!session || session.role !== "supplier") return new Response(null, { status: 401 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 404 });
  const image = await supplierProducts.image(session.userId, id);
  if (!image) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
