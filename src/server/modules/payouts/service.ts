import { randomInt } from "node:crypto";
import type { Session } from "@/server/auth/types";
import { ApiError } from "@/server/http/errors";
import { bankRepository } from "@/server/modules/bank/repository";
import { getBankAccount } from "@/server/modules/bank/service";
import { getDashboardSummary } from "@/server/modules/dashboard/service";
import { eventBus } from "@/server/realtime/eventBus";
import { maskIban } from "@/shared/bank/schemas";
import {
  MIN_PAYOUT,
  createPayoutSchema,
  listPayoutsQuerySchema,
  type ListPayoutsQuery,
} from "@/shared/payouts/schemas";
import { newPayoutId, nextReference, payoutRepository } from "./repository";
import type { PayoutPage, PayoutRecord, PublicPayout } from "./schema";

/** SANDBOX: how long the simulated bank takes to confirm. A real transfer takes days. */
const SETTLE_MIN_MS = 15_000;
const SETTLE_MAX_MS = 25_000;

/** Lazily applies the bank's confirmation once its (simulated) delay has passed. */
function settle(p: PayoutRecord): PayoutRecord {
  if (p.status === "pending" && Date.now() >= p.completeAt) {
    p.status = "completed";
    p.completedAt = p.completeAt;
  }
  return p;
}

export function toPublic(p: PayoutRecord): PublicPayout {
  return {
    id: p.id,
    reference: p.reference,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    bank: p.bank,
    createdAt: new Date(p.createdAt).toISOString(),
    completedAt: p.completedAt ? new Date(p.completedAt).toISOString() : undefined,
  };
}

const availableFor = async (storeId: string) =>
  (await getDashboardSummary(storeId)).availableBalance.value.amount;

export async function listPayouts(auth: Session, rawQuery: ListPayoutsQuery): Promise<PayoutPage> {
  const query = listPayoutsQuerySchema.parse(rawQuery);
  const all = payoutRepository.all(auth.storeId).map(settle);
  all.sort((a, b) => b.createdAt - a.createdAt || b.reference.localeCompare(a.reference));

  const start = (query.page - 1) * query.pageSize;
  return {
    items: all.slice(start, start + query.pageSize).map(toPublic),
    total: all.length,
    page: query.page,
    pageSize: query.pageSize,
    available: await availableFor(auth.storeId),
    minAmount: MIN_PAYOUT,
    hasPending: all.some((p) => p.status === "pending"),
    bank: await getBankAccount(auth),
  };
}

/**
 * Requests a transfer of `amount` (minor units) to the store's bank account. The amount leaves
 * the available balance at once (it cannot be withdrawn twice) and the payout is `pending` until
 * the simulated bank confirms it. Owner only.
 */
export async function requestPayout(auth: Session, input: unknown): Promise<PublicPayout> {
  if (auth.role !== "owner") throw new ApiError("forbidden");
  const { amount } = createPayoutSchema.parse(input);

  const bank = bankRepository.get(auth.storeId);
  if (!bank) throw new ApiError("no_bank_account");

  // One at a time: also what makes a double click harmless.
  if (
    payoutRepository
      .all(auth.storeId)
      .map(settle)
      .some((p) => p.status === "pending")
  ) {
    throw new ApiError("payout_pending");
  }
  if (amount > (await availableFor(auth.storeId))) throw new ApiError("insufficient_balance");

  const now = Date.now();
  const payout = payoutRepository.save({
    id: newPayoutId(),
    storeId: auth.storeId,
    reference: nextReference(now),
    amount,
    currency: "AOA",
    status: "pending",
    bank: { holderName: bank.holderName, ibanMasked: maskIban(bank.iban) },
    createdAt: now,
    completeAt: now + randomInt(SETTLE_MIN_MS, SETTLE_MAX_MS + 1),
  });

  // Every open dashboard sees the new balance immediately, not on the next tick.
  eventBus.publish(auth.storeId, "dashboard.summary", await getDashboardSummary(auth.storeId));
  return toPublic(payout);
}
