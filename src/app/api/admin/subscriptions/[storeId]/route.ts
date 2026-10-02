import { z } from "zod";
import { isAdmin } from "@/server/auth/admin";
import { requireSession } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";
import { clientIp } from "@/server/http/rateLimit";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { recordAudit } from "@/server/modules/audit/service";
import { userRepository } from "@/server/modules/auth/userRepository";
import { setAccountActive } from "@/server/modules/billing/lifecycle";
import { billingRepository } from "@/server/modules/billing/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = z.object({ action: z.enum(["activate", "deactivate"]) });

/** The administrator's quick switch for one store's access to the platform. Administrators only; audited. */
export const POST = handle(async (req, ctx: { params: Promise<{ storeId: string }> }) => {
  assertSameOrigin(req);
  const session = await requireSession(req, { allowUnpaid: true });
  if (!(await isAdmin(session))) throw new ApiError("not_found");
  const { storeId } = await ctx.params;
  const { action } = body.parse(await readJson(req));

  const before = await billingRepository.subscription(storeId);
  const after = await setAccountActive(storeId, action === "activate");
  if (!before || !after) throw new ApiError("not_found");

  const actor = await userRepository.findById(session.userId);
  await recordAudit({
    actorId: session.userId,
    actorEmail: actor?.email ?? null,
    action: action === "activate" ? "subscription.activate" : "subscription.deactivate",
    target: storeId,
    before: { suspended: before.suspended, periodEnd: before.periodEnd },
    after: { suspended: after.suspended, periodEnd: after.periodEnd },
    ip: clientIp(req),
  });
  return json({ ok: true, suspended: after.suspended, periodEnd: after.periodEnd });
});
