import { payoutRepository } from "./repository";

/**
 * How much of the store's balance has already been requested for withdrawal. Deliberately its
 * own tiny module: the dashboard needs it to show the right balance, and the payout service
 * needs the dashboard — this keeps that from becoming a cycle.
 *
 * Pending and completed payouts both count: the money left the balance when it was requested.
 */
export function reservedAmount(storeId: string): number {
  return payoutRepository
    .all(storeId)
    .filter((payout) => !payout.historical)
    .reduce((sum, payout) => sum + payout.amount, 0);
}
