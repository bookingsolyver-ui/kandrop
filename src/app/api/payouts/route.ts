import { requireSession } from "@/server/auth/session";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { listPayouts, requestPayout } from "@/server/modules/payouts/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Payout history (newest first) plus what the merchant can withdraw right now. */
export const GET = handle(async (req) => {
  const auth = await requireSession(req);
  const query = Object.fromEntries(
    [...new URL(req.url).searchParams].filter(([, value]) => value !== "")
  );
  return json(await listPayouts(auth, query), { headers: { "Cache-Control": "no-store" } });
});

/** Requests a transfer to the store's bank account. `{ amount }` in minor units. */
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const auth = await requireSession(req);
  const payout = await requestPayout(auth, await readJson(req, 1_000));
  return json(payout, { status: 201, headers: { Location: "/api/payouts" } });
});
