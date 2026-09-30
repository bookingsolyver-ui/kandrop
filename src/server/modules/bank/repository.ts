import { db, must } from "@/server/db/client";
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
          iban: String(row.iban),
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
        iban: account.iban,
        updated_at: account.updatedAt,
      })
    );
    return account;
  },
};
