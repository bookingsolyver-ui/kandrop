import { isAdmin } from "@/server/auth/admin";
import { requireSession } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";
import { clientIp } from "@/server/http/rateLimit";
import { assertSameOrigin, handle, json } from "@/server/http/respond";
import { recordAudit } from "@/server/modules/audit/service";
import { userRepository } from "@/server/modules/auth/userRepository";
import { cancelOrder } from "@/server/modules/fulfilment/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cancels an order and gives its reserved stock back (one database transaction, see `cancelOrder`).
 * Kandrop administrators ONLY: a merchant calling this gets the same 404 as for any unknown route, and the merchant API
 * has no way to change an order at all (the golden rule). Audited with the operator.
 */
export const POST = handle(async (req, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const session = await requireSession(req, { allowUnpaid: true });
  if (!(await isAdmin(session))) throw new ApiError("not_found");
  const { id } = await ctx.params;
  if (!/^ord_[A-Za-z0-9_-]{10,40}$/.test(id)) throw new ApiError("not_found");

  const result = await cancelOrder(id);

  const actor = await userRepository.findById(session.userId);
  await recordAudit({
    actorId: session.userId,
    actorEmail: actor?.email ?? null,
    action: "order.cancel",
    target: id,
    before: { status: result.before, paymentStatus: result.paymentStatus },
    after: { status: "cancelled", stockRestored: result.restored, refundDue: result.paymentStatus === "paid_verified" },
    ip: clientIp(req),
  });
  return json({ ok: true, restored: result.restored, refundDue: result.paymentStatus === "paid_verified" });
});
