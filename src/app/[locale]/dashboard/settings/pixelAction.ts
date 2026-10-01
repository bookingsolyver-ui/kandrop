"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { hasAccess } from "@/server/auth/access";
import { readSession } from "@/server/auth/session";
import { storeRepository } from "@/server/modules/store/repository";
import { getStore } from "@/server/modules/store/service";
import { metaPixelSchema } from "@/shared/store/metaPixel";

export type PixelResult =
  | { ok: true; metaPixelId: string | null }
  | { ok: false; error: "validation" | "unauthorized" | "forbidden" | "internal" };

/** Saves (or removes, when empty) the store's own Meta Pixel id. Owner only; the store comes from the session, never from the browser. */
export async function saveMetaPixelAction(raw: unknown): Promise<PixelResult> {
  const session = await readSession();
  if (!session || session.role === "supplier" || !(await hasAccess(session))) return { ok: false, error: "unauthorized" };
  if (session.role !== "owner") return { ok: false, error: "forbidden" };
  try {
    const { metaPixelId } = metaPixelSchema.parse(raw);
    const store = await getStore(session); // makes sure the row exists
    await storeRepository.saveMetaPixel(store.id, metaPixelId || null);
    revalidatePath("/[locale]/dashboard/settings", "page");
    return { ok: true, metaPixelId: metaPixelId || null };
  } catch (err) {
    if (err instanceof ZodError) return { ok: false, error: "validation" };
    console.error("[settings] saveMetaPixel failed", err instanceof Error ? err.message : err);
    return { ok: false, error: "internal" };
  }
}
