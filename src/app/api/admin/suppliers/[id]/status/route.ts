import { z } from "zod";
import { isAdmin } from "@/server/auth/admin";
import { requireSession } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";
import { clientIp } from "@/server/http/rateLimit";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { recordAudit } from "@/server/modules/audit/service";
import { userRepository } from "@/server/modules/auth/userRepository";
import { setSupplierStatus } from "@/server/modules/supplier/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = z.object({ status: z.enum(["approved", "rejected", "pending"]) });

/**
 * Approves, rejects or puts back on hold a supplier company. Administrators only. A `rejected` supplier
 * is locked out at once (its session stops validating); an `approved` one can sign in. Audited.
 */
export const POST = handle(async (req, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const session = await requireSession(req, { allowUnpaid: true });
  if (!(await isAdmin(session))) throw new ApiError("not_found");
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError("not_found");
  const { status } = body.parse(await readJson(req));

  const changed = await setSupplierStatus(id, status);
  if (!changed) throw new ApiError("not_found");

  const actor = await userRepository.findById(session.userId);
  await recordAudit({
    actorId: session.userId,
    actorEmail: actor?.email ?? null,
    action: status === "approved" ? "supplier.approve" : status === "rejected" ? "supplier.reject" : "supplier.hold",
    target: id,
    before: { status: changed.before },
    after: { status },
    ip: clientIp(req),
  });
  return json({ ok: true });
});
