import { z } from "zod";
import { isAdmin } from "@/server/auth/admin";
import { requireSession } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";
import { clientIp } from "@/server/http/rateLimit";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { recordAudit } from "@/server/modules/audit/service";
import { userRepository } from "@/server/modules/auth/userRepository";
import { setWinning } from "@/server/modules/vitrine/winning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = z.object({ winning: z.boolean() });

/** The Kandrop team highlights (or un-highlights) a catalogue product as a "Winning Product". Administrators only; audited. */
export const POST = handle(async (req, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const session = await requireSession(req, { allowUnpaid: true });
  if (!(await isAdmin(session))) throw new ApiError("not_found");
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError("not_found");
  const { winning } = body.parse(await readJson(req));

  const changed = await setWinning(id, winning);
  if (!changed) throw new ApiError("not_found");

  const actor = await userRepository.findById(session.userId);
  await recordAudit({
    actorId: session.userId,
    actorEmail: actor?.email ?? null,
    action: winning ? "supplier_product.winning_on" : "supplier_product.winning_off",
    target: id,
    before: { winning: changed.before },
    after: { winning },
    ip: clientIp(req),
  });
  return json({ ok: true });
});
