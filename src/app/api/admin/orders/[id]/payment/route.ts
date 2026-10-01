import { z } from "zod";
import { isAdmin } from "@/server/auth/admin";
import { requireSession } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";
import { clientIp } from "@/server/http/rateLimit";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { recordAudit } from "@/server/modules/audit/service";
import { userRepository } from "@/server/modules/auth/userRepository";
import { confirmOrderPayment, registerPaymentProof } from "@/server/modules/fulfilment/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = z.object({
  action: z.enum(["proof", "confirm"]),
  reference: z.string().trim().max(80).optional(),
  note: z.string().trim().max(300).optional(),
});

/**
 * The Kandrop team handles an order's payment: `proof` = the slip arrived on WhatsApp (with an optional reference
 * or note), `confirm` = the money is in Kandrop's account (`paid_verified`, the financial trigger). Administrators
 * only, and only for orders whose provider is the manual WhatsApp transfer; every step is audited with the operator.
 */
export const POST = handle(async (req, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const session = await requireSession(req, { allowUnpaid: true });
  if (!(await isAdmin(session))) throw new ApiError("not_found");
  const { id } = await ctx.params;
  if (!/^ord_[A-Za-z0-9_-]{10,40}$/.test(id)) throw new ApiError("not_found");
  const { action, reference, note } = body.parse(await readJson(req));

  const actor = await userRepository.findById(session.userId);
  const source = { kind: "admin" as const, operatorId: session.userId, operatorEmail: actor?.email ?? null };
  const evidence = { reference, note };
  const result = action === "proof" ? await registerPaymentProof(id, source, evidence) : await confirmOrderPayment(id, source, evidence);

  if (action === "proof" || ("changed" in result && result.changed)) {
    await recordAudit({
      actorId: session.userId,
      actorEmail: actor?.email ?? null,
      action: action === "proof" ? "payment.proof" : "payment.verify",
      target: id,
      before: { paymentStatus: result.before },
      after: { paymentStatus: action === "proof" ? "proof_submitted" : "paid_verified", reference: reference ?? null, note: note ?? null },
      ip: clientIp(req),
    });
  }
  return json({ ok: true });
});
