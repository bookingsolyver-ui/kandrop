import { z } from "zod";
import { isAdmin } from "@/server/auth/admin";
import { requireSession } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";
import { clientIp } from "@/server/http/rateLimit";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { recordAudit } from "@/server/modules/audit/service";
import { userRepository } from "@/server/modules/auth/userRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = z.object({ action: z.enum(["revoke", "ban", "unban"]) });
const AUDIT = { revoke: "user.revoke_sessions", ban: "user.ban", unban: "user.unban" } as const;

/**
 * Kill switch for one account (a merchant, or later a supplier): `revoke` signs it out of every
 * device, `ban` does that and blocks it from signing in again until `unban`. Administrators only;
 * the change takes effect on the account's very next request.
 */
export const POST = handle(async (req, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const session = await requireSession(req, { allowUnpaid: true });
  if (!(await isAdmin(session))) throw new ApiError("not_found");
  const { id } = await ctx.params;
  const { action } = body.parse(await readJson(req));

  const target = await userRepository.findById(id);
  if (!target) throw new ApiError("not_found");
  if (target.id === session.userId && action === "ban") throw new ApiError("validation_failed");

  if (action === "revoke") await userRepository.revokeSessions(id);
  else await userRepository.setBanned(id, action === "ban");

  const actor = await userRepository.findById(session.userId);
  await recordAudit({
    actorId: session.userId,
    actorEmail: actor?.email ?? null,
    action: AUDIT[action],
    target: id,
    before: { banned: target.banned },
    after: { banned: action === "ban" ? true : action === "unban" ? false : target.banned },
    ip: clientIp(req),
  });
  return json({ ok: true });
});
