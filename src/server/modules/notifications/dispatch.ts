import "server-only";
import { dispatchExternalNotification } from "@/lib/notifications/webhook-dispatcher";
import { db } from "@/server/db/client";
import { sendPush } from "./push";

const kz = (minor: number) => String(Math.round(minor / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/**
 * Tells everyone concerned about a new sale: the merchant's and the administrators' browsers (Web Push) and the external
 * channels (Telegram for the admin, WhatsApp for the merchant). It is called AFTER the order is saved and it NEVER throws:
 * every part is isolated, so a failing channel can neither undo nor delay (beyond a few seconds) the order.
 */
export async function notifyNewSale(sale: { storeId: string; storeName: string; total: number; locale: string }): Promise<void> {
  try {
    const body = `${kz(sale.total)} Kz. Verifique o seu painel.`;
    let whatsapp: string | undefined;
    try {
      const { data } = await db().from("stores").select("settings").eq("id", sale.storeId).maybeSingle();
      const value = ((data?.settings ?? {}) as { notify_whatsapp?: unknown }).notify_whatsapp;
      whatsapp = typeof value === "string" ? value : undefined;
    } catch {
      /* no number: the WhatsApp alert is skipped */
    }
    await Promise.allSettled([
      sendPush("merchant", sale.storeId, { title: "Nova Venda Realizada!", body, url: `/${sale.locale}/dashboard/orders` }),
      sendPush("admin", undefined, { title: "Nova Venda Realizada!", body, url: `/${sale.locale}/admin/encomendas` }),
      dispatchExternalNotification({ total: sale.total, storeName: sale.storeName }, "admin"),
      dispatchExternalNotification({ total: sale.total, storeName: sale.storeName }, "merchant", whatsapp),
    ]);
  } catch (err) {
    console.error("[notify] new sale notification failed", err instanceof Error ? err.message : err);
  }
}
