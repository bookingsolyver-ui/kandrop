import { requireSession } from "@/server/auth/session";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { createCheckout, toPublic } from "@/server/modules/checkout/service";
import type { CreateCheckoutInput } from "@/shared/checkout/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Merchant-authenticated. Turns a cart into a payable checkout session and returns the
 * buyer-facing path. Totals are computed here, from the items — never trusted from the caller.
 */
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const auth = await requireSession(req);
  const session = await createCheckout(auth, (await readJson(req)) as CreateCheckoutInput);

  return json({ ...toPublic(session), path: `/checkout?session=${session.id}` }, { status: 201 });
});
