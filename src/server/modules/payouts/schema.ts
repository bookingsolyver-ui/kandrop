import "server-only";
import type { PublicBankAccount } from "@/server/modules/bank/schema";
import type { PayoutStatus } from "@/shared/payouts/schemas";

export interface PayoutRecord {
  id: string;
  storeId: string;
  /** Human-readable, sequential: `LV-2026-000001`. What the merchant quotes to support. */
  reference: string;
  /** Minor units. */
  amount: number;
  /** Kandrop's fixed withdrawal fee (200 Kz for new requests, 0 for older ones): `amount - fee` is what reaches the bank. */
  fee: number;
  currency: "AOA";
  status: PayoutStatus;
  /** Where it went, frozen at request time: changing the bank details later never rewrites history. */
  bank: { holderName: string; ibanMasked: string };
  createdAt: number;
  /** Unused since the simulated bank was removed (kept: the column is not null). */
  completeAt: number;
  completedAt?: number;
  /**
   * Past payouts that only exist to fill the demo history. The simulator's balance is already
   * "after" them, so they must not be subtracted from it again.
   */
  historical?: boolean;
}

export interface PublicPayout {
  id: string;
  reference: string;
  amount: number;
  fee: number;
  /** What is transferred to the bank: `amount - fee`. */
  net: number;
  currency: "AOA";
  status: PayoutStatus;
  bank: { holderName: string; ibanMasked: string };
  createdAt: string;
  completedAt?: string;
}

export interface PayoutPage {
  items: PublicPayout[];
  total: number;
  page: number;
  pageSize: number;
  /** Balance the merchant could withdraw right now (already net of pending/completed payouts). */
  available: number;
  minAmount: number;
  /** The fee a new withdrawal will carry. */
  fee: number;
  hasPending: boolean;
  /** Destination of the next payout (masked), or `null` if none is set up yet. */
  bank: PublicBankAccount | null;
}
