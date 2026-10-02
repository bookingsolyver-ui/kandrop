import { z } from "zod";
import { isAdmin } from "@/server/auth/admin";
import { requireSession } from "@/server/auth/session";
import { getEnv } from "@/server/config/env";
import { db, must } from "@/server/db/client";
import { ApiError } from "@/server/http/errors";
import { clientIp } from "@/server/http/rateLimit";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { recordAudit } from "@/server/modules/audit/service";
import { userRepository } from "@/server/modules/auth/userRepository";
import { billingRepository } from "@/server/modules/billing/repository";
import { sendMaintenanceEmails } from "@/server/modules/notifications/subscriptionEmail";
import { orderPaymentInfo } from "@/server/modules/payments/transfer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Every merchant owner, read page by page: the API returns at most 1000 rows per request, and nobody may be left out. */
async function allOwners() {
  const PAGE = 1000;
  const out: Array<{ email: unknown; store_id: unknown; store_name: unknown; banned: unknown }> = [];
  for (let from = 0; ; from += PAGE) {
    const page = must("admin.maintenance.owners", await db().from("users").select("email,store_id,store_name,banned").eq("role", "owner").order("id").range(from, from + PAGE - 1)) ?? [];
    out.push(...page);
    if (page.length < PAGE) return out;
  }
}

/** `YYYY-MM-DDTHH:mm` as typed in the console: Luanda's clock (UTC+1, no daylight saving). */
const luanda = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  .transform((v) => Date.parse(`${v}:00+01:00`))
  .refine((ms) => Number.isFinite(ms));

const body = z
  .object({
    reason: z.string().trim().min(3).max(200),
    startsAt: luanda.optional(),
    endsAt: luanda.optional(),
    duration: z.string().trim().max(60).optional(),
    /** Only the accounts with an active subscription. Default: EVERY registered merchant account (banned ones excepted). */
    onlyActive: z.boolean().default(false),
  })
  .refine((v) => v.startsAt !== undefined || (v.duration ?? "") !== "", { message: "when" })
  .refine((v) => v.startsAt === undefined || v.endsAt === undefined || v.endsAt > v.startsAt, { message: "order" });

/**
 * Mass "planned maintenance" notice to EVERY registered merchant account (or only the active ones with `onlyActive`; banned accounts are
 * left out and counted). Administrators only; audited. One e-mail failing never stops the others (see `sendMaintenanceEmails`); the answer is
 * the exact report: how many were sent, how many failed and which addresses (with the reason). Without `RESEND_API_KEY` nothing is sent
 * and `configured: false` says why.
 */
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const session = await requireSession(req, { allowUnpaid: true });
  if (!(await isAdmin(session))) throw new ApiError("not_found");
  const input = body.parse(await readJson(req));

  const [owners, subs] = await Promise.all([allOwners(), billingRepository.allSubscriptions()]);
  const now = Date.now();
  const live = new Set(subs.filter((s) => !s.suspended && s.periodEnd > now).map((s) => s.storeId));
  const seen = new Set<string>();
  let skippedBanned = 0;
  const recipients = owners.flatMap((u) => {
    const to = String(u.email).trim().toLowerCase();
    if (!to || seen.has(to)) return [];
    if (u.banned) { skippedBanned += 1; return []; } // blocked by the team: cannot sign in, nothing to warn them about
    if (input.onlyActive && !live.has(String(u.store_id))) return [];
    seen.add(to);
    return [{ to, storeName: String(u.store_name) }];
  });

  const env = getEnv();
  const configured = !!env.RESEND_API_KEY;
  const report = await sendMaintenanceEmails(
        { reason: input.reason, startsAt: input.startsAt ?? null, endsAt: input.endsAt ?? null, duration: input.duration || null, support: { whatsapp: orderPaymentInfo().whatsapp ?? null, email: env.SUPPORT_EMAIL ?? null } },
    recipients,
  );

  const actor = await userRepository.findById(session.userId);
  await recordAudit({
    actorId: session.userId,
    actorEmail: actor?.email ?? null,
    action: "notification.maintenance",
    target: "all_merchants",
    before: null,
    after: { reason: input.reason, recipients: recipients.length, sent: report.sent, failed: report.failed, skippedBanned, onlyActive: input.onlyActive },
    ip: clientIp(req),
  });
  return json({ ok: true, configured, recipients: report.total, sent: report.sent, failed: report.failed, skippedBanned, failures: report.failures.slice(0, 100) });
});
