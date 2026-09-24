import { ApiError } from "@/server/http/errors";
import { handle, json } from "@/server/http/respond";
import {
  SIGNATURE_HEADER,
  multicaixaEventSchema,
  verifySignature,
} from "@/server/modules/payments/multicaixa";
import { applyProviderEvent } from "@/server/modules/payments/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 10_000;

/**
 * Multicaixa Express → us: the payer approved or refused on their phone.
 *
 * Public by nature (no session, no Origin check: the caller is a server, not a browser), so the
 * only thing that makes it safe is the signature over the *raw* body. Anything unsigned, stale
 * or altered is a 401 and changes nothing. A valid event is acknowledged with 200 even if it is
 * a repeat, so the provider stops retrying.
 */
export const POST = handle(async (req) => {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    throw new ApiError("payload_too_large");
  }
  const raw = await req.text(); // the exact bytes that were signed
  if (raw.length > MAX_BODY_BYTES) throw new ApiError("payload_too_large");

  if (!verifySignature(req.headers.get(SIGNATURE_HEADER), raw)) {
    throw new ApiError("unauthenticated");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new ApiError("validation_failed");
  }
  const outcome = applyProviderEvent(multicaixaEventSchema.parse(payload));
  return json({ received: true, outcome });
});
