import { z } from "zod";
import { isAdmin } from "@/server/auth/admin";
import { requireSession } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";
import { clientIp } from "@/server/http/rateLimit";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { recordAudit } from "@/server/modules/audit/service";
import { userRepository } from "@/server/modules/auth/userRepository";
import { decideMerchantPayout } from "@/server/modules/payouts/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = z.object({ status: z.enum(["paid", "rejected"]) });

/** The Kandrop team pays a merchant's payout (the transfer was made) or rejects it. Administrators only; audited. */
export const POST = handle(async (req, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const session = await requireSession(req, { allowUnpaid: true });
  if (!(await isAdmin(session))) throw new ApiError("not_found");
  const { id } = await ctx.params;
  if (!/^pot_[A-Za-z0-9_-]{6,40}$/.test(id)) throw new ApiError("not_found");
  const { status } = body.parse(await readJson(req));

  const { storeId } = await decideMerchantPayout(id, status === "paid" ? "completed" : "rejected");
  const actor = await userRepository.findById(session.userId);
  await recordAudit({
    actorId: session.userId,
    actorEmail: actor?.email ?? null,
    action: status === "paid" ? "payout.approve" : "payout.reject",
    target: id,
    before: { status: "pending" },
    after: { status: status === "paid" ? "completed" : "rejected", storeId },
    ip: clientIp(req),
  });
  return json({ ok: true });
});
