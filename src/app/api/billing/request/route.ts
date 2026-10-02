import { after } from "next/server";
import { requireSession } from "@/server/auth/session";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { userRepository } from "@/server/modules/auth/userRepository";
import { requestPlan } from "@/server/modules/billing/service";
import { notifyNewPlanRequest } from "@/server/modules/notifications/adminAlerts";
import type { UpgradeInput } from "@/shared/billing/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `{ plan: "starter" | "pro" }` → the merchant's request for that plan, saved as pending until the team approves it after the payment. Owner only.
 * The administrators are alerted (bell, Web Push, e-mail) AFTER the response goes out (`after`), so the merchant never waits for them.
 */
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const auth = await requireSession(req, { allowUnpaid: true });
  const result = await requestPlan(auth, (await readJson(req, 1_000)) as UpgradeInput);
  after(async () => {
    const owner = await userRepository.findById(auth.userId).catch(() => null);
    await notifyNewPlanRequest({ storeName: owner?.storeName ?? "", merchantEmail: owner?.email ?? "", plan: result.plan, requestedAt: result.requestedAt });
  });
  return json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
});
