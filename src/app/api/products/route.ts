import { requireSession } from "@/server/auth/session";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { createProduct, listProducts } from "@/server/modules/products/service";
import { MAX_PRODUCT_BODY_BYTES } from "@/shared/products/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/** Merchant catalogue: search, filters, sorting and paging are all applied on the server. */
export const GET = handle(async (req) => {
  const auth = await requireSession(req);
  // An empty value in the query string (`?q=`) means "not set".
  const query = Object.fromEntries(
    [...new URL(req.url).searchParams].filter(([, value]) => value !== "")
  );
  return json(await listProducts(auth, query), { headers: noStore });
});

export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const auth = await requireSession(req);
  const product = await createProduct(auth, await readJson(req, MAX_PRODUCT_BODY_BYTES));
  return json(product, { status: 201, headers: { Location: `/api/products/${product.id}` } });
});
