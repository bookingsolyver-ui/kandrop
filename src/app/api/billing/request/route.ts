import { requireSession } from "@/server/auth/session";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { requestPlan } from "@/server/modules/billing/service";
import type { UpgradeInput } from "@/shared/billing/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** `{ plan: "starter" | "pro" }` → the merchant's request for that plan, saved as pending until the team approves it after the payment. Owner only. */
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const auth = await requireSession(req, { allowUnpaid: true });
  const result = await requestPlan(auth, (await readJson(req, 1_000)) as UpgradeInput);
  return json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
});
