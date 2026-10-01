import { z } from "zod";
import { isAdmin } from "@/server/auth/admin";
import { requireSession } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";
import { clientIp } from "@/server/http/rateLimit";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { recordAudit } from "@/server/modules/audit/service";
import { userRepository } from "@/server/modules/auth/userRepository";
import { advanceLogistics } from "@/server/modules/fulfilment/service";
import { LOGISTICS_STATUSES } from "@/shared/fulfilment/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = z.object({ status: z.enum(LOGISTICS_STATUSES) });

/** The Kandrop team moves a supplier order one step forward on its journey. Administrators only; audited. */
export const POST = handle(async (req, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const session = await requireSession(req, { allowUnpaid: true });
  if (!(await isAdmin(session))) throw new ApiError("not_found");
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError("not_found");
  const { status } = body.parse(await readJson(req));

  const { before, row } = await advanceLogistics(id, status);

  const actor = await userRepository.findById(session.userId);
  await recordAudit({
    actorId: session.userId,
    actorEmail: actor?.email ?? null,
    action: "logistics.update",
    target: `${row.orderNumber}/${id}`,
    before: { status: before },
    after: { status },
    ip: clientIp(req),
  });
  return json({ ok: true, status: row.status });
});
