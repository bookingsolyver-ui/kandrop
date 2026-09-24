import { clientIp } from "@/server/http/rateLimit";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { createPayment } from "@/server/modules/payments/service";
import type { PaymentRequestInput } from "@/shared/checkout/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public: called by the buyer's browser. Returns the transaction with status
 * `pending` (waiting for phone confirmation), `success`, or `failed`.
 * Request bodies may contain card data — they are validated and dropped, never logged or stored.
 */
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const payment = await createPayment((await readJson(req)) as PaymentRequestInput, clientIp(req));
  return json(payment, { status: payment.status === "pending" ? 202 : 201 });
});
