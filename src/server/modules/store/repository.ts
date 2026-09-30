import { db, must } from "@/server/db/client";
import type { Store } from "./schema";

const fromRow = (row: Record<string, unknown>): Store => ({
  id: String(row.id),
  name: String(row.name),
  nif: row.nif === null ? null : String(row.nif),
  currency: "AOA",
  status: row.status as Store["status"],
});

export const storeRepository = {
  async get(id: string): Promise<Store | null> {
    const row = must("stores.get", await db().from("stores").select("*").eq("id", id).maybeSingle());
    return row ? fromRow(row) : null;
  },

  /** Creates the store row the first time it is needed (a concurrent creation keeps the first). */
  async ensure(id: string, name: string): Promise<Store> {
    must(
      "stores.ensure",
      await db()
        .from("stores")
        .upsert({ id, name }, { onConflict: "id", ignoreDuplicates: true })
    );
    return (await this.get(id)) ?? { id, name, nif: null, currency: "AOA", status: "pending_verification" };
  },
};
