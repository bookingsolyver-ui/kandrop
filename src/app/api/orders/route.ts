import { requireSession } from "@/server/auth/session";
import { handle, json } from "@/server/http/respond";
import { listOrders } from "@/server/modules/orders/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Merchant orders: search, status filter, sorting and paging are applied on the server.
 * Orders are created by the checkout, not here, so this route only reads.
 */
export const GET = handle(async (req) => {
  const auth = await requireSession(req);
  // An empty value in the query string (`?q=`) means "not set".
  const query = Object.fromEntries(
    [...new URL(req.url).searchParams].filter(([, value]) => value !== "")
  );
  return json(await listOrders(auth, query), { headers: { "Cache-Control": "no-store" } });
});
