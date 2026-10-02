import { render } from "@react-email/components";
import { Resend } from "resend";
import { getEnv } from "@/server/config/env";
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

/** Hands one rendered message to Resend. Returns whether the provider accepted it; NEVER throws, never waits long. Without `RESEND_API_KEY` nothing is sent. */
async function deliver(label: string, to: string, message: { subject: string; html: string; text: string }): Promise<boolean> {
  const env = getEnv();
  if (!env.RESEND_API_KEY) return false;
  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const send = resend.emails.send({ from: env.EMAIL_FROM ?? "Kandrop <onboarding@resend.dev>", to, ...message });
    const result = await Promise.race([send, new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))]);
    if (!result) { console.error(`[email] ${label} e-mail timed out`); return false; }
    if ("error" in result && result.error) { console.error(`[email] ${label} e-mail was refused:`, result.error.name, result.error.message); return false; }
    return true;
  } catch (err) {
    console.error(`[email] ${label} e-mail failed`, err instanceof Error ? err.message : err);
    return false;
  }
}

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
  /** Epoch ms of the new end of the paid period. */
  newPeriodEnd: number;
}

export async function renderPaymentSuccessEmail(d: PaymentSuccessData) {
  const element = KandropPaymentSuccessEmail({ shopName: d.storeName, planName: d.planName, newExpirationDate: dayOf(d.newPeriodEnd) });
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

const BATCH = 50;

/**
 * Sends the notice to many merchants. Messages go to Resend in batches of 50 (one request each, well inside its rate limit); if a
 * batch is refused, its messages are retried ONE BY ONE so a single bad address never costs the others their e-mail. Never throws:
 * the result says how many were accepted and how many were not.
 */
export async function sendMaintenanceEmails(notice: MaintenanceNotice, recipients: MaintenanceRecipient[]): Promise<{ sent: number; failed: number }> {
  const env = getEnv();
  if (!env.RESEND_API_KEY || recipients.length === 0) return { sent: 0, failed: recipients.length };
  const resend = new Resend(env.RESEND_API_KEY);
  const from = env.EMAIL_FROM ?? "Kandrop <onboarding@resend.dev>";
  let sent = 0;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const chunk = recipients.slice(i, i + BATCH);
    const messages = (
      await Promise.all(
        chunk.map(async (r) => {
          try {
            return { to: r.to, ...(await renderMaintenanceEmail(notice, r.storeName)) };
          } catch (err) {
            console.error("[email] maintenance e-mail could not be rendered", err instanceof Error ? err.message : err);
            return null;
          }
        }),
      )
    ).filter((m): m is NonNullable<typeof m> => m !== null);
    let accepted = false;
    try {
      const result = await Promise.race([
        resend.batch.send(messages.map((m) => ({ from, to: m.to, subject: m.subject, html: m.html, text: m.text }))),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 15_000)),
      ]);
      accepted = !!result && !result.error;
      if (!accepted) console.error("[email] maintenance batch was not accepted; retrying one by one", result?.error?.message ?? "timeout");
    } catch (err) {
      console.error("[email] maintenance batch failed; retrying one by one", err instanceof Error ? err.message : err);
    }
    if (accepted) sent += messages.length;
    else for (const m of messages) if (await deliver("maintenance", m.to, m)) sent += 1;
  }
  return { sent, failed: recipients.length - sent };
}
