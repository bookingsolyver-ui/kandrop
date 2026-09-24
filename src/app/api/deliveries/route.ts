import { requireSession } from "@/server/auth/session";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { dispatchOrder, listDeliveries } from "@/server/modules/logistics/service";
import type { DispatchInput } from "@/shared/logistics/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/** Deliveries of the store (newest first) with per-status counts. `?status=in_transit|delivered|returned`. */
export const GET = handle(async (req) => {
  const auth = await requireSession(req);
  const query = Object.fromEntries(
    [...new URL(req.url).searchParams].filter(([, value]) => value !== "")
  );
  return json(await listDeliveries(auth, query), { headers: noStore });
});

/** One-click dispatch: `{ orderId }`. Picks the courier, creates the delivery, ships the order. */
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const auth = await requireSession(req);
  const delivery = await dispatchOrder(auth, (await readJson(req, 1_000)) as DispatchInput);
  return json(delivery, { status: 201, headers: noStore });
});
