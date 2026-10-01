import { z } from "zod";
import { isAdmin } from "@/server/auth/admin";
import { requireSession } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";
import { clientIp } from "@/server/http/rateLimit";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { recordAudit } from "@/server/modules/audit/service";
import { userRepository } from "@/server/modules/auth/userRepository";
import { decideWithdrawal } from "@/server/modules/supplier/withdrawals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = z.object({ status: z.enum(["paid", "rejected"]) });

/** The Kandrop team marks a supplier's withdrawal as paid (the transfer was made) or rejects it. Administrators only; audited. */
export const POST = handle(async (req, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const session = await requireSession(req, { allowUnpaid: true });
  if (!(await isAdmin(session))) throw new ApiError("not_found");
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError("not_found");
  const { status } = body.parse(await readJson(req));

  const actor = await userRepository.findById(session.userId);
  const { before } = await decideWithdrawal(id, status, actor?.email ?? session.userId);
  await recordAudit({
    actorId: session.userId,
    actorEmail: actor?.email ?? null,
    action: status === "paid" ? "withdrawal.pay" : "withdrawal.reject",
    target: id,
    before: { status: before },
    after: { status },
    ip: clientIp(req),
  });
  return json({ ok: true });
});
