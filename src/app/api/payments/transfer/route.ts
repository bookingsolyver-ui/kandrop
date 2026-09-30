import { clientIp } from "@/server/http/rateLimit";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { createBankTransfer } from "@/server/modules/payments/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Confirm transfer" for a Kandrop plan: `{ sessionId }` → a payment that stays `pending` until the
 * transfer is validated. It never activates a plan by itself. Public like `/api/payments` (the
 * unguessable checkout session is the credential), and refused for shoppers' purchases.
 */
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const payment = await createBankTransfer(await readJson(req, 1_000), clientIp(req));
  return json(payment, { status: 202, headers: { "Cache-Control": "no-store" } });
});
