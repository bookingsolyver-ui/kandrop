import { Resend } from "resend";
import { getEnv } from "@/server/config/env";

export type SubscriptionEmailKind = "reminder" | "deactivated";

export interface SubscriptionEmailData {
  to: string;
  name: string;
  storeName: string;
  planName: string;
  /** Epoch ms of the end of the paid period. */
  periodEnd: number;
  /** Minor units: what the renewal costs. */
  renewalAmount: number;
  support?: { whatsapp?: string | null; email?: string | null };
}

const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const kz = (minor: number) => `${String(Math.round(minor / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} Kz`;
/** Luanda is UTC+1 all year: the date the merchant sees on their calendar. */
const dayOf = (ms: number) => new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "long", year: "numeric", timeZone: "Africa/Luanda" }).format(new Date(ms));

export function renderSubscriptionEmail(kind: SubscriptionEmailKind, d: SubscriptionEmailData) {
  const first = d.name.trim().split(/\s+/)[0] || "";
  const date = dayOf(d.periodEnd);
  const price = kz(d.renewalAmount);
  const contacts = [d.support?.whatsapp ? `WhatsApp ${d.support.whatsapp}` : null, d.support?.email ?? null].filter((x): x is string => !!x);
  const help = contacts.length ? `Para pagar ou tirar dúvidas, fale connosco: ${contacts.join(" ou ")}.` : "Para pagar ou tirar dúvidas, fale com a equipa Kandrop.";
  const reminder = kind === "reminder";
  const subject = reminder ? "A sua subscrição Kandrop termina em 3 dias" : "A sua conta Kandrop foi desativada";
  const title = reminder ? "A sua subscrição termina em 3 dias" : "A sua conta foi desativada";
  const lines = reminder
    ? [
        `Olá ${first}, a subscrição ${d.planName} da loja ${d.storeName} termina a ${date}.`,
        `Para não perder o acesso ao painel, faça o pagamento da renovação (${price}) antes dessa data. Não há débito automático: a renovação é paga por si.`,
        help,
      ]
    : [
        `Olá ${first}, a subscrição ${d.planName} da loja ${d.storeName} terminou a ${date} e a conta foi desativada. O acesso ao painel está suspenso.`,
        `Para reativar, pague a renovação (${price}) e avise a equipa: a conta volta a ficar ativa assim que um administrador a ativar.`,
        help,
      ];
  const html = `<!doctype html><html lang="pt"><body style="margin:0;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#111;padding:18px 28px;color:#fff;font-size:18px;font-weight:700">Kandrop</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-size:22px">${esc(title)}</h1>
${lines.map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6">${esc(l)}</p>`).join("\n")}
</td></tr></table></td></tr></table></body></html>`;
  return { subject, html, text: lines.join("\n\n") };
}

/** Sends one lifecycle e-mail. Returns whether the provider accepted it; NEVER throws, never waits long. Without `RESEND_API_KEY` nothing is sent. */
export async function sendSubscriptionEmail(kind: SubscriptionEmailKind, data: SubscriptionEmailData): Promise<boolean> {
  const env = getEnv();
  if (!env.RESEND_API_KEY) return false;
  try {
    const { subject, html, text } = renderSubscriptionEmail(kind, data);
    const resend = new Resend(env.RESEND_API_KEY);
    const send = resend.emails.send({ from: env.EMAIL_FROM ?? "Kandrop <onboarding@resend.dev>", to: data.to, subject, html, text });
    const result = await Promise.race([send, new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))]);
    if (!result) { console.error("[email] subscription e-mail timed out", { kind }); return false; }
    if ("error" in result && result.error) { console.error("[email] subscription e-mail was refused:", result.error.name, result.error.message); return false; }
    return true;
  } catch (err) {
    console.error("[email] subscription e-mail failed", err instanceof Error ? err.message : err);
    return false;
  }
}
