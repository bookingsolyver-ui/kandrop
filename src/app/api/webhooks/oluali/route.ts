import { z } from "zod";
import { ApiError } from "@/server/http/errors";
import { handle, json } from "@/server/http/respond";
import { OLUALI_SIGNATURE_HEADER, verifyOlualiSignature } from "@/server/modules/payments/oluali";
import { applyProviderEvent } from "@/server/modules/payments/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 20_000;

/** The fields we rely on; the rest of Oluali's payload (fee, net_amount, paid_at…) is ignored. */
const eventSchema = z.object({
  event: z.string(),
  status: z.string(),
  transaction_id: z.string().min(1).max(100),
  client_reference_id: z.string().min(1).max(100),
  /** Minor units (cêntimos). */
  amount: z.number().int().positive(),
});

/**
 * Oluali → us: a customer finished a payment.
 *
 * Public by nature (the caller is a server), so the only thing that makes it safe is `X-Signature`:
 * the HMAC-SHA256 of the *raw* body with `OLUALI_WEBHOOK_SECRET`. Anything unsigned or altered is a
 * 401 and changes nothing.
 *
 * Only `payment.success` + `SUCCESS` settles a payment. `applyProviderEvent` finds it by the Oluali
 * `transaction_id` we stored as `providerRef`, checks that `client_reference_id` is its checkout
 * session and that the amount matches, and is idempotent, so retries are harmless. Any other event is
 * acknowledged and ignored. A payment we do not know (yet) answers 404 so Oluali can retry.
 */
export const POST = handle(async (req) => {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    throw new ApiError("payload_too_large");
  }
  const raw = await req.text(); // the exact bytes that were signed
  if (raw.length > MAX_BODY_BYTES) throw new ApiError("payload_too_large");

  if (!verifyOlualiSignature(req.headers.get(OLUALI_SIGNATURE_HEADER), raw)) {
    throw new ApiError("unauthenticated");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new ApiError("validation_failed");
  }
  const event = eventSchema.parse(payload);

  if (event.event !== "payment.success" || event.status !== "SUCCESS") {
    console.info("[oluali] webhook ignored", { event: event.event, status: event.status });
    return json({ received: true, outcome: "ignored" });
  }

  const outcome = await applyProviderEvent(
    {
      event: "payment.succeeded",
      transactionId: event.transaction_id,
      amount: event.amount,
      currency: "AOA",
    },
    { clientReferenceId: event.client_reference_id }
  );
  if (outcome === "unknown") {
    console.warn("[oluali] webhook for an unknown transaction", { tx: event.transaction_id });
    throw new ApiError("not_found");
  }
  return json({ received: true, outcome });
});
