import { requireSession } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";
import { handle, json } from "@/server/http/respond";
import { listDeliveries } from "@/server/modules/logistics/service";

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

/**
 * READ-ONLY for merchants. Dispatching, collecting and delivering are Kandrop's operations, done from the
 * admin console; a merchant's session is refused at once (403), whatever it sends.
 */
const refuse = handle(async (req) => {
  await requireSession(req);
  throw new ApiError("forbidden");
});
export const POST = refuse;
export const PUT = refuse;
export const PATCH = refuse;
export const DELETE = refuse;
