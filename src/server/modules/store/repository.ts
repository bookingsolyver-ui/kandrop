import { db, must } from "@/server/db/client";
import type { Store } from "./schema";

/**
 * The project's `stores` table is (id, name, slug, owner_id, settings jsonb, created_at): the tax
 * number and the verification status live in `settings`, which has room for them.
 */
const fromRow = (row: Record<string, unknown>): Store => {
  const settings = (row.settings ?? {}) as { nif?: string | null; status?: Store["status"] };
  return {
    id: String(row.id),
    name: String(row.name),
    nif: settings.nif ?? null,
    currency: "AOA",
    status: settings.status ?? "pending_verification",
  };
};

export const storeRepository = {
  async get(id: string): Promise<Store | null> {
    const row = must("stores.get", await db().from("stores").select("*").eq("id", id).maybeSingle());
    return row ? fromRow(row) : null;
  },

  /** Switches the sample data on for the store (kept in `settings.demo`). */
  async enableDemo(id: string): Promise<void> {
    const row = must(
      "stores.settings",
      await db().from("stores").select("settings").eq("id", id).maybeSingle()
    );
    const settings = { ...((row?.settings as object | null) ?? {}), demo: true };
    must("stores.enableDemo", await db().from("stores").update({ settings }).eq("id", id));
  },

  /** Creates the store row the first time it is needed (a concurrent creation keeps the first). */
  async ensure(id: string, name: string, ownerId: string): Promise<Store> {
    must(
      "stores.ensure",
      await db()
        .from("stores")
        .upsert(
          { id, name, slug: id, owner_id: ownerId, settings: {}, created_at: Date.now() },
          { onConflict: "id", ignoreDuplicates: true }
        )
    );
    return (
      (await this.get(id)) ?? { id, name, nif: null, currency: "AOA", status: "pending_verification" }
    );
  },
};
