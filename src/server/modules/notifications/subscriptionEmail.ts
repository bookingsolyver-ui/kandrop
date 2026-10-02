import { render } from "@react-email/components";
import { Resend } from "resend";
import { getEnv } from "@/server/config/env";
import { KandropNewRequestAdminEmail } from "@/emails/KandropNewRequestAdminEmail";
import { KandropMaintenanceEmail } from "@/emails/KandropMaintenanceEmail";
import { KandropPaymentSuccessEmail } from "@/emails/KandropPaymentSuccessEmail";
import { KandropSubscriptionEmail, type KandropSubscriptionEmailProps, type SubscriptionEmailKind } from "@/emails/KandropSubscriptionEmail";

export type { SubscriptionEmailKind };

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

const kz = (minor: number) => `${String(Math.round(minor / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} Kz`;
/** Luanda is UTC+1 all year: the date the merchant sees on their calendar. */
const dayOf = (ms: number) => new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Luanda" }).format(new Date(ms));
const DAY = 86_400_000;

/** The button: the support WhatsApp when set, else the support e-mail, else the site. */
function ctaOf(support: SubscriptionEmailData["support"]) {
  if (support?.whatsapp) return `https://wa.me/244${support.whatsapp}`;
  if (support?.email) return `mailto:${support.email}`;
  return "https://www.kandrop.com";
}

export async function renderSubscriptionEmail(kind: SubscriptionEmailKind, d: SubscriptionEmailData, now = Date.now()) {
  const props: KandropSubscriptionEmailProps = {
    kind,
    shopName: d.storeName,
    daysLeft: Math.max(0, Math.ceil((d.periodEnd - now) / DAY)),
    expirationDate: dayOf(d.periodEnd),
    planName: d.planName,
    renewalAmount: kz(d.renewalAmount),
    ctaUrl: ctaOf(d.support),
  };
  const element = KandropSubscriptionEmail(props);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  const subject = kind === "reminder" ? "A sua subscrição Kandrop termina em 3 dias" : "A sua conta Kandrop foi desativada";
  return { subject, html, text };
}

export interface DeliveryResult { ok: boolean; error?: string }

/** Hands one rendered message to Resend. NEVER throws and never waits long; `error` says why it was not accepted. Without `RESEND_API_KEY` nothing is sent. */
async function deliverDetailed(label: string, to: string, message: { subject: string; html: string; text: string }): Promise<DeliveryResult> {
  const env = getEnv();
  if (!env.RESEND_API_KEY) return { ok: false, error: "not_configured" };
  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const send = resend.emails.send({ from: env.EMAIL_FROM ?? "Kandrop <onboarding@resend.dev>", to, ...message });
    const result = await Promise.race([send, new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000))]);
    if (!result) { console.error(`[email] ${label} e-mail timed out`); return { ok: false, error: "timeout" }; }
    if ("error" in result && result.error) { console.error(`[email] ${label} e-mail was refused:`, result.error.name, result.error.message); return { ok: false, error: result.error.name }; }
    return { ok: true };
  } catch (err) {
    console.error(`[email] ${label} e-mail failed`, err instanceof Error ? err.message : err);
    return { ok: false, error: err instanceof Error ? err.name : "unknown" };
  }
}

const deliver = async (label: string, to: string, message: { subject: string; html: string; text: string }) => (await deliverDetailed(label, to, message)).ok;

/** Sends the 3-day reminder or the deactivation notice. */
export async function sendSubscriptionEmail(kind: SubscriptionEmailKind, data: SubscriptionEmailData): Promise<boolean> {
  if (!getEnv().RESEND_API_KEY) return false;
  try {
    return await deliver(`subscription ${kind}`, data.to, await renderSubscriptionEmail(kind, data));
  } catch (err) {
    console.error("[email] subscription e-mail could not be rendered", err instanceof Error ? err.message : err);
    return false;
  }
}

export interface PaymentSuccessData {
  to: string;
  storeName: string;
  planName: string;
  /** Minor units: what the confirmed period costs. */
  amount: number;
  /** Epoch ms of the new end of the paid period. */
  newPeriodEnd: number;
}

export async function renderPaymentSuccessEmail(d: PaymentSuccessData) {
  const element = KandropPaymentSuccessEmail({ shopName: d.storeName, planName: d.planName, amount: kz(d.amount), newExpirationDate: dayOf(d.newPeriodEnd) });
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject: "Pagamento confirmado: a sua conta Kandrop está ativa", html, text };
}

/** Sends the "payment confirmed, account active" e-mail the moment an administrator activates or renews an account. */
export async function sendPaymentSuccessEmail(data: PaymentSuccessData): Promise<boolean> {
  if (!getEnv().RESEND_API_KEY) return false;
  try {
    return await deliver("payment success", data.to, await renderPaymentSuccessEmail(data));
  } catch (err) {
    console.error("[email] payment e-mail could not be rendered", err instanceof Error ? err.message : err);
    return false;
  }
}

export interface MaintenanceNotice {
  reason: string;
  /** Epoch ms (or `null`). Shown on Luanda's clock. */
  startsAt: number | null;
  endsAt: number | null;
  duration: string | null;
  support?: { whatsapp?: string | null; email?: string | null };
}

export interface MaintenanceRecipient { to: string; storeName: string }

const timeOf = (ms: number) => new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Luanda" }).format(new Date(ms));

export async function renderMaintenanceEmail(notice: MaintenanceNotice, storeName: string) {
  const element = KandropMaintenanceEmail({
    shopName: storeName,
    reason: notice.reason,
    startsAt: notice.startsAt === null ? null : timeOf(notice.startsAt),
    endsAt: notice.endsAt === null ? null : timeOf(notice.endsAt),
    duration: notice.duration,
    ctaUrl: ctaOf(notice.support),
  });
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject: "Manutenção programada da Kandrop", html, text };
}

/** Sends the maintenance notice to ONE merchant. Never throws. */
export async function sendMaintenanceEmail(notice: MaintenanceNotice, recipient: MaintenanceRecipient): Promise<boolean> {
  if (!getEnv().RESEND_API_KEY) return false;
  try {
    return await deliver("maintenance", recipient.to, await renderMaintenanceEmail(notice, recipient.storeName));
  } catch (err) {
    console.error("[email] maintenance e-mail could not be rendered", err instanceof Error ? err.message : err);
    return false;
  }
}

export interface MaintenanceReport {
  /** Recipients the send was attempted for. */
  total: number;
  sent: number;
  failed: number;
  /** One entry per failure: the address and why (so the administrator can follow up by hand). */
  failures: Array<{ to: string; error: string }>;
}

const CONCURRENCY = 4;
const RETRIES = 3;
const TIME_BUDGET_MS = 240_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends the notice to EVERY recipient, one e-mail each, in a loop of a few parallel workers. Each send has its own try/catch: a
 * failure (bad address, refused, timeout, a render error) is recorded and the loop goes on with the next merchant. A provider rate
 * limit is retried with a pause. Nothing is skipped silently: whoever was not reached (including when the time budget of the request
 * runs out) is in `failures` with the reason. Never throws.
 */
export async function sendMaintenanceEmails(notice: MaintenanceNotice, recipients: MaintenanceRecipient[]): Promise<MaintenanceReport> {
  const report: MaintenanceReport = { total: recipients.length, sent: 0, failed: 0, failures: [] };
  const fail = (to: string, error: string) => { report.failed += 1; report.failures.push({ to, error }); };
  if (!getEnv().RESEND_API_KEY) {
    for (const r of recipients) fail(r.to, "not_configured");
    return report;
  }
  const started = Date.now();
  let next = 0;
  const worker = async () => {
    for (;;) {
      const index = next++;
      const recipient = recipients[index];
      if (!recipient) return;
      if (Date.now() - started > TIME_BUDGET_MS) { fail(recipient.to, "time_limit"); continue; }
      try {
        const message = await renderMaintenanceEmail(notice, recipient.storeName);
        let outcome = await deliverDetailed("maintenance", recipient.to, message);
        for (let attempt = 1; !outcome.ok && outcome.error === "rate_limit_exceeded" && attempt <= RETRIES; attempt += 1) {
          await sleep(500 * attempt);
          outcome = await deliverDetailed("maintenance", recipient.to, message);
        }
        if (outcome.ok) report.sent += 1;
        else fail(recipient.to, outcome.error ?? "unknown");
      } catch (err) {
        console.error("[email] maintenance send failed", err instanceof Error ? err.message : err);
        fail(recipient.to, err instanceof Error ? err.name : "unknown");
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, recipients.length) }, worker));
  return report;
}

export interface NewRequestAlert {
  /** The administrators' addresses (`ADMIN_EMAILS`). */
  to: string[];
  storeName: string;
  merchantEmail: string;
  planName: string;
  requestedAt: number;
}

/** Tells the administrators a merchant just asked for a plan. One e-mail per administrator, each isolated. Never throws; returns how many were accepted. */
export async function sendNewRequestAdminEmails(alert: NewRequestAlert): Promise<number> {
  if (!getEnv().RESEND_API_KEY || alert.to.length === 0) return 0;
  try {
    const element = KandropNewRequestAdminEmail({
      shopName: alert.storeName,
      merchantEmail: alert.merchantEmail,
      planName: alert.planName,
      requestedAt: timeOf(alert.requestedAt),
    });
    const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
    const message = { subject: `Novo pedido de adesão: ${alert.storeName} (${alert.planName})`, html, text };
    const results = await Promise.all(alert.to.map((to) => deliver("new request (admin)", to, message)));
    return results.filter(Boolean).length;
  } catch (err) {
    console.error("[email] new-request alert could not be rendered", err instanceof Error ? err.message : err);
    return 0;
  }
}
