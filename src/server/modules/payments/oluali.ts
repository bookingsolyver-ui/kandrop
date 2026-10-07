import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getEnv } from "@/server/config/env";
import { ApiError } from "@/server/http/errors";

/**
 * Oluali (Angolan payments API), native `fetch`, no SDK.
 *
 *   createCharge    → POST {OLUALI_BASE_URL}/charge    (MCX or REFERENCE, amount in minor units)
 *   requestWithdraw → POST {OLUALI_BASE_URL}/withdraw  (amount in minor units + bank account / IBAN)
 *
 * Every request carries `Authorization: Bearer <OLUALI_API_KEY>`. The key and the webhook secret
 * come from the environment only and are never logged. Confirmation of a charge arrives later on
 * `POST /api/webhooks/oluali`, which uses `verifyOlualiSignature` below.
 */

export const OLUALI_SIGNATURE_HEADER = "x-signature";

/**
 * How long a pending Oluali payment may wait for its webhook before we fail it with `timeout`.
 * MCX is approved on the phone within ~90 s (3 min here, with margin); a REFERENCE can be paid at an ATM or
 * bank for up to 2 h, so it gets 2 h 15 min. Failing a reference early would drop a real payment.
 */
export const OLUALI_TIMEOUT_MS = {
  MCX: 3 * 60 * 1000,
  REFERENCE: 135 * 60 * 1000,
} as const satisfies Record<OlualiPaymentType, number>;
const REQUEST_TIMEOUT_MS = 15_000;

export type OlualiPaymentType = "MCX" | "REFERENCE";

const chargeSchema = z.object({
  /** Integer, minor units (cêntimos). */
  amount: z.number().int().positive(),
  payment_type: z.enum(["MCX", "REFERENCE"]),
  /** Our unique id for the order / cart. */
  client_reference_id: z.string().trim().min(1).max(100),
  customer: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.email(),
    /** Exactly 9 digits (national number, no +244). */
    phone: z.string().regex(/^\d{9}$/),
  }),
});
export type OlualiChargeInput = z.input<typeof chargeSchema>;

const withdrawSchema = z.object({
  amount: z.number().int().positive(),
  bank_account: z.string().trim().min(1).max(60),
});

/** What the API answers; it includes at least `transaction_id` and `status`. */
export interface OlualiResponse {
  transaction_id: string;
  status: string;
  [key: string]: unknown;
}

/** Fields of a charge that are for us, not for the payer: never shown. */
const HIDDEN_DETAILS = /^(transaction_id|merchant_transaction_id|client_reference_id|status|customer|id)$|key|secret|token/i;

/**
 * What the payer must know to pay a REFERENCE charge (entity, reference, deadline…): the plain
 * string / number fields of the provider's answer, minus our own ids. Flat, short, safe to display.
 */
export function chargeInstructions(charge: OlualiResponse): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(charge)) {
    if (HIDDEN_DETAILS.test(key)) continue;
    if ((typeof value === "string" || typeof value === "number") && String(value).length <= 200) {
      out[key] = String(value);
    }
  }
  return Object.keys(out).length ? out : undefined;
}

/** The provider refused or failed. `status` is the HTTP status; `body` is the provider's own answer (never our secrets). */
export class OlualiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown
  ) {
    super(`oluali_${status}`);
  }
}

function config() {
  const { OLUALI_API_KEY, OLUALI_BASE_URL } = getEnv();
  if (!OLUALI_API_KEY || !OLUALI_BASE_URL) {
    console.error("[oluali] OLUALI_API_KEY / OLUALI_BASE_URL are not configured");
    throw new ApiError("payments_unavailable");
  }
  return { key: OLUALI_API_KEY, base: OLUALI_BASE_URL.replace(/\/+$/, "") };
}

async function post(path: "/charge" | "/withdraw", payload: unknown): Promise<OlualiResponse> {
  const { key, base } = config();
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    console.error("[oluali] request failed", {
      path,
      error: err instanceof Error ? err.name : "unknown",
    });
    throw new ApiError("payments_unavailable");
  }

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    console.error("[oluali] provider error", { path, status: res.status });
    throw new OlualiError(res.status, body);
  }
  return body as OlualiResponse;
}

/** Creates a charge. Throws a `ZodError` (422) on invalid input, `OlualiError` if the provider refuses. */
export function createCharge(data: OlualiChargeInput): Promise<OlualiResponse> {
  return post("/charge", chargeSchema.parse(data));
}

/** Requests a withdrawal of `amount` (minor units) to `bank_account` (account number / IBAN). */
export function requestWithdraw(amount: number, bank_account: string): Promise<OlualiResponse> {
  return post("/withdraw", withdrawSchema.parse({ amount, bank_account }));
}

/**
 * `X-Signature` = hex HMAC-SHA256 of the *raw* request body, keyed with `OLUALI_WEBHOOK_SECRET`.
 * Compared in constant time. No secret configured = nothing verifies (fails closed).
 */
export function verifyOlualiSignature(header: string | null, rawBody: string): boolean {
  const secret = getEnv().OLUALI_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const received = Buffer.from(header.trim().replace(/^sha256=/i, ""), "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}
