import type { BankAccountRecord } from "./schema";

/**
 * STUB — in-memory, per process, lost on restart. Replace with a `bank_accounts` table (one
 * row per store) with the IBAN **encrypted at rest**; the functions below are the contract.
 */
const g = globalThis as unknown as { __kandropBank?: Map<string, BankAccountRecord> };
const accounts = (g.__kandropBank ??= new Map<string, BankAccountRecord>());

export const bankRepository = {
  get: (storeId: string) => accounts.get(storeId) ?? null,
  save(account: BankAccountRecord) {
    accounts.set(account.storeId, account);
    return account;
  },
};
