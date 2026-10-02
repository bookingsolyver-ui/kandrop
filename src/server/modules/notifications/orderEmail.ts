import "server-only";
import { Resend } from "resend";
import { getEnv } from "@/server/config/env";

export interface OrderEmailData {
  to: string;
  customerName: string;
  orderNumber: number;
  storeName: string;
  productTitle: string;
  quantity: number;
  /** Minor units. */
  unitAmount: number;
  discount: number;
  total: number;
  couponCode?: string;
  /** `YYYY-MM-DD`, when the customer chose a day. */
  deliveryDate?: string;
  /** The STORE's own support contacts (never the platform's). */
  support?: { whatsapp?: string | null; email?: string | null };
}

const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
/** `13 500 Kz`: always grouped by thousands (pt-PT alone would not group 4-digit numbers). */
const kz = (minor: number) => `${String(Math.round(minor / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} Kz`;
const day = (iso: string) => {
  const at = Date.parse(`${iso}T00:00:00Z`);
  return Number.isNaN(at) ? iso : new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(at);
};

/** The e-mail's HTML and plain text. Customer-controlled text (name, product) is escaped; no images, no emojis. */
export function renderOrderEmail(d: OrderEmailData): { subject: string; html: string; text: string } {
  const first = d.customerName.split(" ")[0] ?? d.customerName;
  const rows: Array<[string, string]> = [
    ["Produto", `${d.productTitle} x ${d.quantity}`],
    ["Preço", kz(d.unitAmount * d.quantity)],
    ...(d.discount > 0 ? ([[`Cupão${d.couponCode ? ` ${d.couponCode}` : ""}`, `-${kz(d.discount)}`]] as Array<[string, string]>) : []),
    ["Total a pagar na entrega", kz(d.total)],
    ...(d.deliveryDate ? ([["Dia de entrega pedido", day(d.deliveryDate)]] as Array<[string, string]>) : []),
  ];
  // Questions go to the STORE that sold the product, with ITS contacts only.
  const w = d.support?.whatsapp ? `WhatsApp ${d.support.whatsapp.replace(/(\d{3})(?=\d)/g, "$1 ")}` : null;
  const em = d.support?.email ?? null;
  const contacts = [w, em].filter((x): x is string => !!x);
  const help = contacts.length ? { text: `Em caso de dúvida, contacte a loja ${d.storeName} através de ${contacts.join(" ou ")}.`, html: `Em caso de dúvida, contacte a loja ${esc(d.storeName)} através de ${contacts.map(esc).join(" ou ")}.` } : null;
  const table = rows
    .map(([k, v], i) => `<tr><td style="padding:10px 0;border-top:1px solid #e6e6e6;color:#6b6b6b;font-size:14px">${esc(k)}</td><td style="padding:10px 0;border-top:1px solid #e6e6e6;text-align:right;font-size:14px;${i === rows.findIndex(([x]) => x.startsWith("Total")) ? "font-weight:700" : ""}">${esc(v)}</td></tr>`)
    .join("");
  const html = `<!doctype html><html lang="pt"><body style="margin:0;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#111;padding:18px 28px;color:#fff;font-size:18px;font-weight:700">Kandrop</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-size:22px">A sua encomenda foi confirmada</h1>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6">Olá ${esc(first)}, obrigado pela sua encomenda #${d.orderNumber} na loja ${esc(d.storeName)}.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px">${table}</table>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6"><strong>Pagamento na entrega.</strong> Não paga nada agora: o pagamento é feito diretamente ao estafeta, no momento em que receber o produto.</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6">O estafeta entrará em contacto consigo por chamada ou WhatsApp para combinar a entrega. Mantenha o telemóvel por perto.</p>
${help ? `<p style="margin:0 0 12px;font-size:15px;line-height:1.6">${help.html}</p>` : ""}
<p style="margin:20px 0 0;font-size:13px;color:#6b6b6b">Se não fez esta encomenda, ignore este e-mail.</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = [
    `Olá ${first}, obrigado pela sua encomenda #${d.orderNumber} na loja ${d.storeName}.`,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    "Pagamento na entrega: não paga nada agora, paga diretamente ao estafeta quando receber o produto.",
    "O estafeta entrará em contacto consigo por chamada ou WhatsApp para combinar a entrega.",
    ...(help ? ["", help.text] : []),
  ].join("\n");
  return { subject: "A sua encomenda foi confirmada - Kandrop", html, text };
}

/**
 * Sends the order confirmation to the customer. Only when `RESEND_API_KEY` is set. It NEVER throws and never waits
 * long: a failure (or a slow provider) is logged and the order, already saved, is untouched.
 */
export async function sendOrderConfirmation(data: OrderEmailData): Promise<void> {
  const env = getEnv();
  if (!env.RESEND_API_KEY) return;
  try {
    const { subject, html, text } = renderOrderEmail(data);
    const resend = new Resend(env.RESEND_API_KEY);
    const send = resend.emails.send({ from: env.EMAIL_FROM ?? "Kandrop <onboarding@resend.dev>", to: data.to, subject, html, text });
    const result = await Promise.race([send, new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))]);
    if (result && "error" in result && result.error) console.error("[email] order confirmation was refused:", result.error.name, result.error.message);
    else if (!result) console.error("[email] order confirmation timed out", { order: data.orderNumber });
  } catch (err) {
    console.error("[email] order confirmation failed", err instanceof Error ? err.message : err);
  }
}
