import { requireSession } from "@/server/auth/session";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { startUpgrade } from "@/server/modules/billing/service";
import type { UpgradeInput } from "@/shared/billing/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** `{ plan: "growth" | "scale" }` → a checkout session to pay that plan's next 30 days. Owner only. */
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const auth = await requireSession(req);
  const session = await startUpgrade(auth, (await readJson(req, 1_000)) as UpgradeInput);
  return json(session, { status: 201, headers: { "Cache-Control": "no-store" } });
});
