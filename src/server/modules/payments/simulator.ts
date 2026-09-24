import type { PaymentRequest } from "@/shared/checkout/schemas";
import type { FailureCode } from "./schema";

/**
 * SANDBOX ONLY — stands in for the real provider (Multicaixa Express, Unitel Money, card
 * processor). Outcomes are deterministic so every state can be exercised on purpose:
 *
 *   Mobile money  (answers later, like a confirmation on the phone)
 *     …00  → failed: declined_by_customer      …01 → failed: insufficient_funds      else → success
 *     Multicaixa Express answers through a signed webhook after 5–10 s (see `multicaixa.ts`);
 *     Unitel Money answers by polling after PENDING_MS.
 *   Card          (answers immediately)
 *     4000 0000 0000 0002 → card_declined     4000 0000 0000 9995 → insufficient_funds   else → success
 */
export const PENDING_MS = 6_000;

export type Verdict = { status: "success" } | { status: "failed"; failureCode: FailureCode };

export type Simulation =
  { kind: "immediate"; verdict: Verdict } | { kind: "pending"; afterMs: number; verdict: Verdict };

const ok: Verdict = { status: "success" };
const fail = (failureCode: FailureCode): Verdict => ({ status: "failed", failureCode });

/** The mobile-money test-number rule, shared by every simulated mobile provider. */
export function mobileVerdict(phone: string): Verdict {
  const last2 = phone.slice(-2);
  if (last2 === "00") return fail("declined_by_customer");
  if (last2 === "01") return fail("insufficient_funds");
  return ok;
}

export function simulate(req: PaymentRequest): Simulation {
  if (req.method === "card") {
    const n = req.card.number;
    if (n === "4000000000000002") return { kind: "immediate", verdict: fail("card_declined") };
    if (n === "4000000000009995") return { kind: "immediate", verdict: fail("insufficient_funds") };
    return { kind: "immediate", verdict: ok };
  }

  return { kind: "pending", afterMs: PENDING_MS, verdict: mobileVerdict(req.phone) };
}
