import { z } from "zod";
import { isAdmin } from "@/server/auth/admin";
import { requireSession } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";
import { clientIp } from "@/server/http/rateLimit";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { AUDIT_ACTIONS, recordAudit } from "@/server/modules/audit/service";
import { userRepository } from "@/server/modules/auth/userRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = z.object({
  action: z.enum(AUDIT_ACTIONS),
  target: z.string().trim().min(1).max(120),
  before: z.record(z.string(), z.unknown()).optional(),
  after: z.record(z.string(), z.unknown()).optional(),
});

/**
 * An administrator's sensitive action succeeded: write it to the audit trail. Only a signed-in
 * account whose e-mail is in `ADMIN_EMAILS` may write; the actor, the time and the IP come from
 * the server, never from the request body.
 */
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const session = await requireSession(req, { allowUnpaid: true });
  if (!(await isAdmin(session))) throw new ApiError("not_found");
  const input = body.parse(await readJson(req));
  if (JSON.stringify(input).length > 4_000) throw new ApiError("payload_too_large");

  const user = await userRepository.findById(session.userId);
  await recordAudit({
    actorId: session.userId,
    actorEmail: user?.email ?? null,
    action: input.action,
    target: input.target,
    before: input.before ?? null,
    after: input.after ?? null,
    ip: clientIp(req),
  });
  return json({ ok: true }, { status: 201 });
});
