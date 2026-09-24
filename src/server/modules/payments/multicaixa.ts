import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getEnv } from "@/server/config/env";
import { ApiError } from "@/server/http/errors";
import { isAngolanMobile } from "@/shared/checkout/schemas";
import type { FailureCode } from "./schema";
import { mobileVerdict } from "./simulator";

/**
 * SANDBOX ONLY — stands in for Multicaixa Express. It behaves like the real integration will:
 *
 *   1. `requestPayment` asks the provider to charge a phone → returns a *pending* transaction id.
 *   2. Some time later (5–10 s: the payer opens the app and approves) the provider calls our
 *      webhook, `POST /api/webhooks/multicaixa`, with a **signed** event.
 *   3. The webhook verifies the signature and settles the payment.
 *
 * The signature is what makes step 3 safe: the webhook is public, so without it anyone could
 * "confirm" an unpaid order. When a real provider is integrated, only this file changes (its
 * client + its signature scheme); the webhook route and the payment service stay as they are.
 */
export const CALLBACK_MIN_MS = 5_000;
export const CALLBACK_MAX_MS = 10_000;
/** No callback within this long → the payment fails with `timeout` instead of hanging forever. */
export const PROVIDER_TIMEOUT_MS = 3 * 60 * 1000;

export const SIGNATURE_HEADER = "x-multicaixa-signature";
const TOLERANCE_SECONDS = 5 * 60;
const WEBHOOK_PATH = "/api/webhooks/multicaixa";

export const multicaixaEventSchema = z.object({
  event: z.enum(["payment.succeeded", "payment.failed"]),
  transactionId: z.string().regex(/^MCX-[A-Z0-9]{12}$/),
  /** Minor units. */
  amount: z.number().int().positive(),
  currency: z.literal("AOA"),
  reason: z.enum(["declined_by_customer", "insufficient_funds"]).optional(),
  occurredAt: z.iso.datetime(),
});
export type MulticaixaEvent = z.infer<typeof multicaixaEventSchema>;

// ── Signing ───────────────────────────────────────────────────────────────────────────────

const g = globalThis as unknown as { __kandropMcxSecret?: string };

/** Sandbox without a configured secret: random per process (the "provider" is this process). */
const secret = () =>
  getEnv().MULTICAIXA_WEBHOOK_SECRET ?? (g.__kandropMcxSecret ??= randomBytes(32).toString("hex"));

const sign = (body: string, timestamp: number) =>
  createHmac("sha256", secret()).update(`${timestamp}.${body}`).digest("hex");

/**
 * Header format: `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">`. The timestamp is
 * part of the signed text and must be recent, so a captured request cannot be replayed later.
 */
export function verifySignature(header: string | null, rawBody: string, now = Date.now()): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.trim().split("=", 2)));
  const timestamp = Number(parts.t);
  const received = parts.v1;
  if (!Number.isInteger(timestamp) || typeof received !== "string") return false;
  if (Math.abs(now / 1000 - timestamp) > TOLERANCE_SECONDS) return false;

  const expected = Buffer.from(sign(rawBody, timestamp), "hex");
  const actual = Buffer.from(received, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// ── The simulated provider ────────────────────────────────────────────────────────────────

const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newTransactionId = () =>
  `MCX-${Array.from(randomBytes(12), (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join("")}`;

/** Loopback by default, from configuration only — never from the request's Host header (SSRF). */
const callbackUrl = () =>
  `${(getEnv().APP_URL ?? `http://127.0.0.1:${process.env.PORT ?? 3000}`).replace(/\/$/, "")}${WEBHOOK_PATH}`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Providers retry a webhook that was not acknowledged; so does this one (3 attempts). */
async function deliver(event: MulticaixaEvent) {
  const body = JSON.stringify(event);
  for (let attempt = 1; attempt <= 3; attempt++) {
    const timestamp = Math.floor(Date.now() / 1000);
    try {
      const res = await fetch(callbackUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [SIGNATURE_HEADER]: `t=${timestamp},v1=${sign(body, timestamp)}`,
        },
        body,
        signal: AbortSignal.timeout(5_000),
      });
      if (res.ok) return;
      console.error("[multicaixa] callback rejected", {
        tx: event.transactionId,
        status: res.status,
      });
    } catch (err) {
      console.error("[multicaixa] callback failed", {
        tx: event.transactionId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    await sleep(1_000 * attempt);
  }
}

/** The reasons a payer can give in the app; other failure codes are ours, not the provider's. */
const providerReason = (code: FailureCode): MulticaixaEvent["reason"] =>
  code === "declined_by_customer" || code === "insufficient_funds" ? code : undefined;

/**
 * Asks Multicaixa Express to charge `phone` (9 national digits) `amount` (minor units).
 * Returns at once with a pending transaction; the outcome arrives later, by webhook.
 * Never logs the phone number.
 */
export function requestPayment(input: { phone: string; amount: number }): {
  transactionId: string;
  status: "pending";
} {
  if (!isAngolanMobile(input.phone)) {
    throw new ApiError("validation_failed", [{ path: ["phone"], message: "phone_invalid" }]);
  }
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new ApiError("validation_failed", [{ path: ["amount"], message: "price_required" }]);
  }

  const transactionId = newTransactionId();
  const verdict = mobileVerdict(input.phone);
  const event: MulticaixaEvent = {
    event: verdict.status === "success" ? "payment.succeeded" : "payment.failed",
    transactionId,
    amount: input.amount,
    currency: "AOA",
    reason: verdict.status === "failed" ? providerReason(verdict.failureCode) : undefined,
    occurredAt: "", // set when the payer answers
  };

  // The payer opens the app and approves: 5–10 s from now.
  const answerIn = randomInt(CALLBACK_MIN_MS, CALLBACK_MAX_MS + 1);
  const timer = setTimeout(() => {
    void deliver({ ...event, occurredAt: new Date().toISOString() });
  }, answerIn);
  timer.unref?.(); // never keeps the process alive on its own

  return { transactionId, status: "pending" };
}
