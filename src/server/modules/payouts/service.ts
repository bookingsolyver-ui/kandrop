import "server-only";
import type { Session } from "@/server/auth/types";
import { ApiError } from "@/server/http/errors";
import { bankRepository } from "@/server/modules/bank/repository";
import { getBankAccount } from "@/server/modules/bank/service";
import { getDashboardSummary } from "@/server/modules/dashboard/service";
import { eventBus } from "@/server/realtime/eventBus";
import { maskIban } from "@/shared/bank/schemas";
import {
  MIN_PAYOUT,
  WITHDRAWAL_FEE,
  withdrawalNet,
  createPayoutSchema,
  listPayoutsQuerySchema,
  type ListPayoutsQuery,
} from "@/shared/payouts/schemas";
import { newPayoutId, nextReference, payoutRepository } from "./repository";
import type { PayoutPage, PayoutRecord, PublicPayout } from "./schema";

export function toPublic(p: PayoutRecord): PublicPayout {
  return {
    id: p.id,
    reference: p.reference,
    amount: p.amount,
    fee: p.fee,
    net: withdrawalNet(p.amount, p.fee),
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
  const all = await payoutRepository.all(auth.storeId);
  all.sort((a, b) => b.createdAt - a.createdAt || b.reference.localeCompare(a.reference));

  const start = (query.page - 1) * query.pageSize;
  return {
    items: all.slice(start, start + query.pageSize).map(toPublic),
    total: all.length,
    page: query.page,
    pageSize: query.pageSize,
    available: await availableFor(auth.storeId),
    minAmount: MIN_PAYOUT,
    fee: WITHDRAWAL_FEE,
    hasPending: all.some((p) => p.status === "pending"),
    bank: await getBankAccount(auth),
  };
}

/**
 * Requests a transfer of `amount` (minor units) to the store's bank account. The amount leaves
 * the available balance at once (it cannot be withdrawn twice) and the payout is `pending` until
 * a Kandrop administrator pays it (or rejects it, which gives the money back). Owner only.
 */
export async function requestPayout(auth: Session, input: unknown): Promise<PublicPayout> {
  if (auth.role !== "owner") throw new ApiError("forbidden");
  const { amount } = createPayoutSchema.parse(input);

  const bank = await bankRepository.get(auth.storeId);
  if (!bank) throw new ApiError("no_bank_account");

  // One at a time: also what makes a double click harmless.
  const existing = await payoutRepository.all(auth.storeId);
  if (existing.some((p) => p.status === "pending")) {
    throw new ApiError("payout_pending");
  }
  if (amount > (await availableFor(auth.storeId))) throw new ApiError("insufficient_balance");

  const now = Date.now();
  const payout = await payoutRepository.create({
    id: newPayoutId(),
    storeId: auth.storeId,
    reference: await nextReference(now),
    amount,
    fee: WITHDRAWAL_FEE, // kept by Kandrop; the bank receives amount − fee
    currency: "AOA",
    status: "pending",
    bank: { holderName: bank.holderName, ibanMasked: maskIban(bank.iban) },
    createdAt: now,
    // No simulated bank any more: it stays pending until an administrator pays or rejects it.
    completeAt: now,
  });

  // Every open dashboard sees the new balance immediately, not on the next tick.
  eventBus.publish(auth.storeId, "dashboard.summary", await getDashboardSummary(auth.storeId));
  return toPublic(payout);
}
