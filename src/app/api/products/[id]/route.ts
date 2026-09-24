import { requireSession } from "@/server/auth/session";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { deleteProduct, getProduct, updateProduct } from "@/server/modules/products/service";
import { MAX_PRODUCT_BODY_BYTES } from "@/shared/products/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const noStore = { headers: { "Cache-Control": "no-store" } };

export const GET = handle(async (req, ctx: Ctx) => {
  const auth = await requireSession(req);
  return json(await getProduct(auth, (await ctx.params).id), noStore);
});

/** Partial update: only the fields sent change. `images` replaces the whole ordered list. */
export const PATCH = handle(async (req, ctx: Ctx) => {
  assertSameOrigin(req);
  const auth = await requireSession(req);
  const body = await readJson(req, MAX_PRODUCT_BODY_BYTES);
  return json(await updateProduct(auth, (await ctx.params).id, body), noStore);
});

export const DELETE = handle(async (req, ctx: Ctx) => {
  assertSameOrigin(req);
  const auth = await requireSession(req);
  await deleteProduct(auth, (await ctx.params).id);
  return new Response(null, { status: 204 });
});
