"use server";

import { revalidatePath } from "next/cache";
import { hasAccess } from "@/server/auth/access";
import { isAdmin } from "@/server/auth/admin";
import { readSession } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { parseSubscription, pushConfigured, saveSubscription, type PushScope } from "@/server/modules/notifications/push";
import { storeRepository } from "@/server/modules/store/repository";
import { getStore } from "@/server/modules/store/service";
import { storeSupportSchema } from "@/shared/store/support";

export type PushResult = { ok: true } | { ok: false; error: "unavailable" | "invalid" | "unauthorized" | "forbidden" | "internal" };

/**
 * Saves this device's push subscription for the signed-in person. The audience is decided HERE from the session, never
 * from the browser: `merchant` needs a paid store account (the device is tied to that store), `admin` needs an administrator.
 */
export async function subscribeToPush(rawSubscription: unknown, scope: PushScope): Promise<PushResult> {
  if (!pushConfigured()) return { ok: false, error: "unavailable" };
  const subscription = parseSubscription(rawSubscription);
  if (!subscription) return { ok: false, error: "invalid" };
  const session = await readSession();
  if (!session || session.role === "supplier") return { ok: false, error: "unauthorized" };
  try {
    if (scope === "admin") {
      if (!(await isAdmin(session))) return { ok: false, error: "forbidden" };
      await saveSubscription("admin", { userId: session.userId }, subscription);
    } else {
      if (!(await hasAccess(session))) return { ok: false, error: "unauthorized" };
      await saveSubscription("merchant", { userId: session.userId, storeId: session.storeId }, subscription);
    }
    return { ok: true };
  } catch (err) {
    console.error("[push] subscribe failed", err instanceof Error ? err.message : err);
    return { ok: false, error: "internal" };
  }
}

/** The merchant's own WhatsApp number for sale alerts (9 digits, starts with 9); empty removes it. Owner only. */
export async function saveNotifyWhatsappAction(raw: unknown): Promise<{ ok: true } | { ok: false; error: "invalid" | "unauthorized" | "forbidden" | "internal" }> {
  const session = await readSession();
  if (!session || session.role === "supplier" || !(await hasAccess(session))) return { ok: false, error: "unauthorized" };
  if (session.role !== "owner") return { ok: false, error: "forbidden" };
  const number = typeof raw === "string" ? raw.replace(/[\s.-]/g, "").replace(/^\+?244/, "") : "";
  if (number !== "" && !/^9\d{8}$/.test(number)) return { ok: false, error: "invalid" };
  try {
    const store = await getStore(session);
    const { data } = await db().from("stores").select("settings").eq("id", store.id).maybeSingle();
    const settings = { ...((data?.settings as Record<string, unknown> | null) ?? {}) };
    if (number) settings.notify_whatsapp = number;
    else delete settings.notify_whatsapp;
    const { error } = await db().from("stores").update({ settings }).eq("id", store.id);
    if (error) throw new Error(error.message);
    revalidatePath("/[locale]/dashboard/settings", "page");
    return { ok: true };
  } catch (err) {
    console.error("[settings] saveNotifyWhatsapp failed", err instanceof Error ? err.message : err);
    return { ok: false, error: "internal" };
  }
}

/** Saves the store's OWN support contacts (the ones its customers see). Owner only; the store comes from the session. */
export async function saveStoreSupportAction(raw: unknown): Promise<{ ok: true } | { ok: false; error: "validation" | "unauthorized" | "forbidden" | "internal"; fields?: Record<string, string> }> {
  const session = await readSession();
  if (!session || session.role === "supplier" || !(await hasAccess(session))) return { ok: false, error: "unauthorized" };
  if (session.role !== "owner") return { ok: false, error: "forbidden" };
  const parsed = storeSupportSchema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) { const k = String(i.path[0] ?? ""); if (k && !fields[k]) fields[k] = i.message; }
    return { ok: false, error: "validation", fields };
  }
  try {
    const store = await getStore(session);
    await storeRepository.saveSupport(store.id, parsed.data);
    revalidatePath("/[locale]/dashboard/settings", "page");
    return { ok: true };
  } catch (err) {
    console.error("[settings] saveStoreSupport failed", err instanceof Error ? err.message : err);
    return { ok: false, error: "internal" };
  }
}
