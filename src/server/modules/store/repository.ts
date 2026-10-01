import { db, must } from "@/server/db/client";
import { tryDecryptNullable } from "@/server/crypto/field";
import type { Store } from "./schema";

/**
 * The project's `stores` table is (id, name, slug, owner_id, settings jsonb, created_at): the tax
 * number and the verification status live in `settings`, which has room for them.
 */
const fromRow = (row: Record<string, unknown>): Store => {
  const settings = (row.settings ?? {}) as { nif?: string | null; status?: Store["status"]; profile?: { province?: string; municipality?: string }; meta_pixel_id?: string };
  return {
    id: String(row.id),
    name: String(row.name),
    nif: tryDecryptNullable(settings.nif ?? null, `stores.nif:${String(row.id)}`),
    province: settings.profile?.province ?? null,
    municipality: settings.profile?.municipality ?? null,
    metaPixelId: settings.meta_pixel_id ?? null,
    currency: "AOA",
    status: settings.status ?? "pending_verification",
  };
};

export const storeRepository = {
  async get(id: string): Promise<Store | null> {
    const row = must("stores.get", await db().from("stores").select("*").eq("id", id).maybeSingle());
    return row ? fromRow(row) : null;
  },

  /** Saves (or, with `null`, removes) the merchant's Meta Pixel id in `settings.meta_pixel_id`; the rest of the settings is kept. */
  async saveMetaPixel(id: string, pixelId: string | null): Promise<void> {
    const row = must("stores.settings", await db().from("stores").select("settings").eq("id", id).maybeSingle());
    if (!row) throw new Error("store not found");
    const settings = { ...((row.settings as Record<string, unknown> | null) ?? {}) };
    if (pixelId) settings.meta_pixel_id = pixelId;
    else delete settings.meta_pixel_id;
    must("stores.saveMetaPixel", await db().from("stores").update({ settings }).eq("id", id));
  },

  /** The pixel id of a store for its PUBLIC pages (product, checkout, confirmation); `null` when none. A failure is never fatal. */
  async metaPixelOf(id: string): Promise<string | null> {
    const { data } = await db().from("stores").select("settings").eq("id", id).maybeSingle();
    const value = ((data?.settings ?? {}) as { meta_pixel_id?: unknown }).meta_pixel_id;
    return typeof value === "string" && /^\d{6,20}$/.test(value) ? value : null;
  },

  /** Saves where the store operates, merged into `settings.profile` (the rest of the settings is kept). */
  async saveProfile(id: string, profile: { province: string; municipality: string }): Promise<void> {
    const row = must("stores.settings", await db().from("stores").select("settings").eq("id", id).maybeSingle());
    if (!row) throw new Error("store not found");
    const settings = { ...((row.settings as object | null) ?? {}), profile };
    must("stores.saveProfile", await db().from("stores").update({ settings }).eq("id", id));
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
      (await this.get(id)) ?? { id, name, nif: null, province: null, municipality: null, metaPixelId: null, currency: "AOA", status: "pending_verification" }
    );
  },
};
