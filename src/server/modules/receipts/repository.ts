import "server-only";
import { db, must } from "@/server/db/client";
import type { Receipt } from "./schema";

export const receiptRepository = {
  async byPayment(paymentId: string): Promise<Receipt | null> {
    const row = must(
      "receipts.byPayment",
      await db().from("receipts").select("receipt").eq("payment_id", paymentId).maybeSingle()
    );
    return row ? (row.receipt as Receipt) : null;
  },

  /** One receipt per payment (unique on `payment_id`): a concurrent duplicate keeps the first. */
  async save(receipt: Receipt): Promise<Receipt> {
    must(
      "receipts.save",
      await db()
        .from("receipts")
        .upsert(
          { payment_id: receipt.paymentId, number: receipt.number, receipt },
          { onConflict: "payment_id", ignoreDuplicates: true }
        )
    );
    return (await this.byPayment(receipt.paymentId)) ?? receipt;
  },

  /** Next sequence value for `year` (1, 2, 3…), atomic in the database. */
  async nextSequence(year: number): Promise<number> {
    return Number(
      must("receipts.sequence", await db().rpc("next_sequence", { seq_name: `receipt:${year}` }))
    );
  },
};
