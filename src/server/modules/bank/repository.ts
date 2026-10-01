import { db, must } from "@/server/db/client";
import { decryptField, encryptField } from "@/server/crypto/field";
import type { BankAccountRecord } from "./schema";

export const bankRepository = {
  async get(storeId: string): Promise<BankAccountRecord | null> {
    const row = must(
      "bank_accounts.get",
      await db().from("bank_accounts").select("*").eq("store_id", storeId).maybeSingle()
    );
    return row
      ? {
          storeId,
          holderName: String(row.holder_name),
          iban: decryptField(String(row.iban), `bank_accounts.iban:${storeId}`),
          updatedAt: Number(row.updated_at),
        }
      : null;
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
