import { getEnv } from "@/server/config/env";

export interface SaleInfo {
  /** Minor units. */
  total: number;
  storeName: string;
}

export type NotificationRole = "admin" | "merchant";

/** `13 500`: whole Kwanzas grouped by thousands. */
const kz = (minor: number) => String(Math.round(minor / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/** The plain text sent to each audience (no emojis, no markup). */
export const saleMessage = (order: SaleInfo, role: NotificationRole) =>
  role === "admin"
    ? `KANDROP: Nova Venda! Valor: ${kz(order.total)} Kz. Loja: ${order.storeName}.`
    : `Parabéns! Nova venda na sua loja ${order.storeName}. Valor: ${kz(order.total)} Kz. Aceda ao painel para os detalhes.`;

/** One POST with a hard timeout; any failure is logged quietly and never thrown. */
async function post(url: string, body: unknown, headers: Record<string, string> = {}): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body), signal: controller.signal, redirect: "error" });
    if (!res.ok) console.error("[notify] webhook answered", res.status);
  } catch (err) {
    console.error("[notify] webhook failed", err instanceof Error ? err.message : err);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Sends the sale alert to the external channels that are configured. The destination URLs come from the environment
 * (trusted), never from a request.
 *  - `admin`: Telegram (`ADMIN_TELEGRAM_WEBHOOK`): body `{ text, chat_id? }`.
 *  - `merchant`: WhatsApp gateway (`WHATSAPP_API_URL`): body `{ to, message }`, `destination` being the merchant's number.
 * Nothing configured (or no destination) = nothing happens. It NEVER throws.
 */
export async function dispatchExternalNotification(order: SaleInfo, role: NotificationRole, destination?: string): Promise<void> {
  try {
    const env = getEnv();
    const text = saleMessage(order, role);
    if (role === "admin") {
      if (env.ADMIN_TELEGRAM_WEBHOOK) await post(env.ADMIN_TELEGRAM_WEBHOOK, { text, ...(env.ADMIN_TELEGRAM_CHAT_ID ? { chat_id: env.ADMIN_TELEGRAM_CHAT_ID } : {}) });
      return;
    }
    if (env.WHATSAPP_API_URL && destination && /^9\d{8}$/.test(destination)) {
      await post(env.WHATSAPP_API_URL, { to: `244${destination}`, message: text }, env.WHATSAPP_API_TOKEN ? { Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}` } : {});
    }
  } catch (err) {
    console.error("[notify] dispatch failed", err instanceof Error ? err.message : err);
  }
}
