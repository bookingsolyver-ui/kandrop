import { z } from "zod";
import { isAdmin } from "@/server/auth/admin";
import { requireSession } from "@/server/auth/session";
import { db, must } from "@/server/db/client";
import { ApiError } from "@/server/http/errors";
import { clientIp } from "@/server/http/rateLimit";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { recordAudit } from "@/server/modules/audit/service";
import { userRepository } from "@/server/modules/auth/userRepository";
import { changeAccount } from "@/server/modules/billing/lifecycle";
import { billingRepository } from "@/server/modules/billing/repository";
import { sendPaymentSuccessEmail } from "@/server/modules/notifications/subscriptionEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = z.object({ action: z.enum(["activate", "deactivate", "renew"]) });
const AUDIT = { activate: "subscription.activate", deactivate: "subscription.deactivate", renew: "subscription.renew" } as const;
const PLAN_NAMES = { starter: "Starter", pro: "Pro" } as const;

/**
 * The administrator's switch for one store: activate / renew (confirming a payment) or deactivate. Administrators only; audited.
 * When a new paid period was added, the merchant gets the "payment confirmed" e-mail in the same request; a failed e-mail never
 * undoes the change (`emailSent: false` tells the console).
 */
export const POST = handle(async (req, ctx: { params: Promise<{ storeId: string }> }) => {
  assertSameOrigin(req);
  const session = await requireSession(req, { allowUnpaid: true });
  if (!(await isAdmin(session))) throw new ApiError("not_found");
  const { storeId } = await ctx.params;
  const { action } = body.parse(await readJson(req));

  const before = await billingRepository.subscription(storeId);
  const after = await changeAccount(storeId, action);
  if (!before || !after) throw new ApiError("not_found");

  const actor = await userRepository.findById(session.userId);
  await recordAudit({
    actorId: session.userId,
    actorEmail: actor?.email ?? null,
    action: AUDIT[action],
    target: storeId,
    before: { suspended: before.suspended, periodEnd: before.periodEnd, periodsPaid: before.periodsPaid },
    after: { suspended: after.suspended, periodEnd: after.periodEnd, periodsPaid: after.periodsPaid },
    ip: clientIp(req),
  });

  let emailSent = false;
  if (after.extended) {
    const owner = (must("admin.sub.owner", await db().from("users").select("email,store_name").eq("store_id", storeId).eq("role", "owner").limit(1)) ?? [])[0];
    if (owner) emailSent = await sendPaymentSuccessEmail({ to: String(owner.email), storeName: String(owner.store_name), planName: PLAN_NAMES[after.plan], newPeriodEnd: after.periodEnd });
  }
  return json({ ok: true, suspended: after.suspended, periodEnd: after.periodEnd, periodsPaid: after.periodsPaid, extended: after.extended, emailSent });
});
