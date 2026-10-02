import "server-only";
import { db, must } from "@/server/db/client";
import { encryptField, tryDecryptField } from "@/server/crypto/field";
import type { BankAccountRecord } from "./schema";

export const bankRepository = {
  async get(storeId: string): Promise<BankAccountRecord | null> {
    const row = must(
      "bank_accounts.get",
      await db().from("bank_accounts").select("*").eq("store_id", storeId).maybeSingle()
    );
    if (!row) return null;
    // An IBAN that cannot be read (the key changed) is treated as "no bank account yet": the merchant
    // enters it again, and no payout can ever go to a wrong or garbled account.
    const iban = tryDecryptField(String(row.iban), `bank_accounts.iban:${storeId}`);
    return iban === null ? null : { storeId, holderName: String(row.holder_name), iban, updatedAt: Number(row.updated_at) };
  },

  async save(account: BankAccountRecord): Promise<BankAccountRecord> {
    must(
      "bank_accounts.save",
      await db().from("bank_accounts").upsert({
        store_id: account.storeId,
        holder_name: account.holderName,
        iban: encryptField(account.iban, `bank_accounts.iban:${account.storeId}`),
        updated_at: account.updatedAt,
      })
    );
    return account;
  },
};
