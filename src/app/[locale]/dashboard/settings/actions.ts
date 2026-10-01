"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { hasAccess } from "@/server/auth/access";
import { readSession } from "@/server/auth/session";
import { getStore } from "@/server/modules/store/service";
import { storeRepository } from "@/server/modules/store/repository";
import { storeProfileSchema } from "@/shared/store/profile";

export type ProfileResult =
  | { ok: true }
  | { ok: false; error: "validation"; fields: Record<string, string> }
  | { ok: false; error: "unauthorized" | "forbidden" | "internal" };

/** Saves where the store operates. Owner only; the store id comes from the session, never from the browser. */
export async function saveStoreProfileAction(raw: unknown): Promise<ProfileResult> {
  const session = await readSession();
  if (!session || session.role === "supplier" || !(await hasAccess(session))) return { ok: false, error: "unauthorized" };
  if (session.role !== "owner") return { ok: false, error: "forbidden" };
  try {
    const profile = storeProfileSchema.parse(raw);
    const store = await getStore(session); // makes sure the row exists
    await storeRepository.saveProfile(store.id, profile);
    revalidatePath("/[locale]/dashboard/settings", "page");
    return { ok: true };
  } catch (err) {
    if (err instanceof ZodError) {
      const fields: Record<string, string> = {};
      for (const i of err.issues) { const k = String(i.path[0] ?? ""); if (k && !fields[k]) fields[k] = i.message; }
      return { ok: false, error: "validation", fields };
    }
    console.error("[settings] saveStoreProfile failed", err instanceof Error ? err.message : err);
    return { ok: false, error: "internal" };
  }
}
