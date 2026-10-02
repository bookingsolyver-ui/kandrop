import { timingSafeEqual } from "node:crypto";
import { getEnv } from "@/server/config/env";
import { runSubscriptionSweep } from "@/server/modules/billing/lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * The daily subscriptions job (Vercel Cron, `vercel.json`, 07:00 UTC = 08:00 in Luanda): reminders 3 days before a period
 * ends, and switching off the accounts whose period ran out. Vercel calls it with `Authorization: Bearer $CRON_SECRET`;
 * without `CRON_SECRET` configured the route refuses to run (it must never be open). `?dry=1` reports what it WOULD do
 * and changes and sends nothing.
 */
export async function GET(req: Request) {
  const secret = getEnv().CRON_SECRET;
  if (!secret) return Response.json({ error: "cron_not_configured" }, { status: 503 });
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!same(given, secret)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const result = await runSubscriptionSweep(Date.now(), dry);
  return Response.json({
    ok: true,
    dryRun: result.dryRun,
    reminded: result.reminded.length,
    deactivated: result.deactivated.length,
    emailFailed: result.emailFailed,
  });
}
