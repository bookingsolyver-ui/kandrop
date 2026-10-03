import "server-only";
import { createHash } from "node:crypto";
import { Resend } from "resend";
import { getEnv } from "@/server/config/env";
import {
  sheetsEnsureEmailColumns,
  sheetsLeads,
  sheetsMarkEmail,
  type Lead,
} from "@/waitlist/lib/sheets";

/**
 * The "Kandrop is live" e-mail to everyone on the waitlist, sent in small batches and remembered per lead in the
 * sheet (column S `email_enviado`, T `email_enviado_em`), so a run can be stopped and resumed without anyone
 * receiving it twice. Only people who consented (`consent = sim`) with a valid address are written to; one address
 * on two rows gets one e-mail.
 */

const esc = (v: string) =>
  v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const siteUrl = () =>
  (process.env.NEXT_PUBLIC_BASE_URL &&
  !/localhost|127\.0\.0\.1/.test(process.env.NEXT_PUBLIC_BASE_URL)
    ? process.env.NEXT_PUBLIC_BASE_URL
    : "https://www.kandrop.com"
  ).replace(/\/$/, "");
const supportEmail = () => process.env.NEXT_PUBLIC_PRIVACY_EMAIL || "suport@kandrop.com";

export interface LaunchEmailData {
  name: string;
  position: number;
  code: string;
}

/** Responsive (single column, fluid up to 560 px), inline styles only, no images: renders the same everywhere. */
export function renderLaunchEmail(d: LaunchEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const first = (d.name.trim().split(/\s+/)[0] ?? "").slice(0, 40);
  const hello = first ? `Olá ${first},` : "Olá,";
  const cta = `${siteUrl()}/pt/register`;
  // The light ("inverted") PNG of the logo, hosted on the site: white lettering for the black header. Absolute URL, as mail clients need.
  const logo = `${siteUrl()}/brand/logo-inverted.png`;
  const subject = "A Kandrop já está no ar";
  const html = `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif;color:#111">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">A lista de espera acabou: já pode criar a sua loja e começar a vender.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td align="center" style="background:#000000;padding:24px 28px;color:#ffffff;font-size:18px;font-weight:700"><img src="${esc(logo)}" alt="Kandrop" width="140" height="28" border="0" style="display:inline-block;width:140px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;color:#ffffff;font-size:18px;font-weight:700"></td></tr>
<tr><td style="padding:32px 28px 8px">
<p style="margin:0 0 6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#d94c00;font-weight:700">Lançamento oficial</p>
<h1 style="margin:0 0 16px;font-size:26px;line-height:1.25">A Kandrop já está no ar.</h1>
<p style="margin:0 0 14px;font-size:16px;line-height:1.6">${esc(hello)}</p>
<p style="margin:0 0 14px;font-size:16px;line-height:1.6">A espera acabou. Estava na nossa lista de espera e, por isso, é das primeiras pessoas a poder criar a loja e começar a vender, sem stock, com entrega em Luanda e Bengo e pagamento na entrega.</p>
<p style="margin:0 0 22px;font-size:16px;line-height:1.6">O seu lugar na lista foi o <strong>n.º ${d.position}</strong>. Obrigado por ter acreditado desde o início.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 26px"><tr><td style="background:#ff5a00;border-radius:999px"><a href="${esc(cta)}" style="display:inline-block;padding:14px 28px;color:#000000;font-size:16px;font-weight:700;text-decoration:none">Criar a minha loja</a></td></tr></table>
<p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#555">Se o botão não abrir, copie este endereço para o browser:<br><a href="${esc(cta)}" style="color:#d94c00;word-break:break-all">${esc(cta)}</a></p>
</td></tr>
<tr><td style="padding:16px 28px 28px;border-top:1px solid #e6e6e6">
<p style="margin:0;font-size:12px;line-height:1.6;color:#6b6b6b">Recebeu este e-mail porque se inscreveu na lista de espera da Kandrop. É uma mensagem única de lançamento. Não quer receber mais nada de nós? Responda a este e-mail ou escreva para <a href="mailto:${esc(supportEmail())}" style="color:#6b6b6b">${esc(supportEmail())}</a> e removemos o seu contacto.</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = [
    hello,
    "",
    "A Kandrop já está no ar.",
    "",
    "A espera acabou. Estava na nossa lista de espera e, por isso, é das primeiras pessoas a poder criar a loja e começar a vender, sem stock, com entrega em Luanda e Bengo e pagamento na entrega.",
    "",
    `O seu lugar na lista foi o n.º ${d.position}. Obrigado por ter acreditado desde o início.`,
    "",
    `Criar a minha loja: ${cta}`,
    "",
    `Recebeu este e-mail porque se inscreveu na lista de espera da Kandrop. É uma mensagem única de lançamento. Para deixar de receber, responda a este e-mail ou escreva para ${supportEmail()}.`,
  ].join("\n");
  return { subject, html, text };
}

const from = () => getEnv().EMAIL_FROM ?? "Kandrop <onboarding@resend.dev>";
const unsubscribeHeaders = () => ({
  "List-Unsubscribe": `<mailto:${supportEmail()}?subject=Remover%20da%20lista>`,
});

/** One test e-mail to an address of yours with sample data: touches nothing in the sheet. */
export async function sendLaunchTest(to: string): Promise<{ ok: boolean; error?: string }> {
  const key = getEnv().RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY em falta" };
  const { subject, html, text } = renderLaunchEmail({
    name: "Maria Silva",
    position: 42,
    code: "TEST",
  });
  const { error } = await new Resend(key).emails.send({
    from: from(),
    to,
    subject: `[Teste] ${subject}`,
    html,
    text,
    replyTo: supportEmail(),
    headers: unsubscribeHeaders(),
  });
  return error ? { ok: false, error: `${error.name}: ${error.message}` } : { ok: true };
}

export interface LaunchRunResult {
  dryRun: boolean;
  /** Leads still to e-mail before this run (consented, valid, not yet sent). */
  pending: number;
  attempted: number;
  sent: number;
  failed: number;
  /** Left over for the next call. */
  remaining: number;
  /** Not eligible: no consent, invalid address or a repeated address. */
  skipped: { noConsent: number; invalidEmail: number; repeated: number; alreadyDone: number };
  /** A masked preview of who this run is for (dry run only). */
  preview?: string[];
}

const mask = (email: string) => email.replace(/^(.{2}).*(@.*)$/, "$1***$2");

/**
 * Sends ONE batch (at most `limit`, never more than Resend's 100). Call it again until `remaining` is 0, with a pause
 * between calls (the script does). A batch that Resend accepts is recorded in the sheet straight away; a batch that
 * fails changes nothing and can be retried. The idempotency key is derived from the recipients, so a retry of the
 * same batch (for example after a sheet write failure) cannot send the e-mails twice.
 */
export async function runLaunchBatch(opts: {
  send: boolean;
  limit: number;
}): Promise<LaunchRunResult> {
  const limit = Math.min(Math.max(Math.floor(opts.limit) || 1, 1), 100);
  await sheetsEnsureEmailColumns();
  const leads = await sheetsLeads();

  const skipped = { noConsent: 0, invalidEmail: 0, repeated: 0, alreadyDone: 0 };
  const seen = new Set(
    leads.filter((l) => l.emailState === "true").map((l) => l.email.toLowerCase())
  );
  const todo: Lead[] = [];
  const repeats: Lead[] = [];
  for (const l of leads) {
    if (l.emailState === "true" || l.emailState === "erro" || l.emailState === "duplicado") {
      skipped.alreadyDone++;
      continue;
    }
    if (!l.consent) {
      skipped.noConsent++;
      continue;
    }
    if (!EMAIL.test(l.email)) {
      skipped.invalidEmail++;
      continue;
    }
    const key = l.email.toLowerCase();
    if (seen.has(key)) {
      skipped.repeated++;
      repeats.push(l);
      continue;
    }
    seen.add(key);
    todo.push(l);
  }
  const batch = todo.slice(0, limit);
  const base = { dryRun: !opts.send, pending: todo.length, skipped };

  if (!opts.send)
    return {
      ...base,
      attempted: 0,
      sent: 0,
      failed: 0,
      remaining: todo.length,
      preview: batch.slice(0, 5).map((l) => mask(l.email)),
    };

  const key = getEnv().RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY em falta");
  const at = new Date().toISOString();

  // Same address on several rows: only the first gets the e-mail; the others are closed so they never block the count.
  if (repeats.length)
    await sheetsMarkEmail(repeats.map((l) => ({ row: l.row, state: "duplicado", at })));
  if (batch.length === 0) return { ...base, attempted: 0, sent: 0, failed: 0, remaining: 0 };

  const emails = batch.map((l) => {
    const { subject, html, text } = renderLaunchEmail({
      name: l.name,
      position: l.position,
      code: l.code,
    });
    return {
      from: from(),
      to: l.email,
      subject,
      html,
      text,
      replyTo: supportEmail(),
      headers: unsubscribeHeaders(),
    };
  });
  const idempotencyKey = `launch-${createHash("sha256")
    .update(
      batch
        .map((l) => l.email.toLowerCase())
        .sort()
        .join("|")
    )
    .digest("hex")
    .slice(0, 40)}`;
  const { data, error } = await new Resend(key).batch.send(emails, {
    batchValidation: "permissive",
    idempotencyKey,
  });
  if (error || !data)
    throw new Error(
      `Resend recusou o lote: ${error?.name ?? "sem resposta"} ${error?.message ?? ""}`.trim()
    );

  const failedIdx = new Set(
    ((data as { errors?: Array<{ index: number }> }).errors ?? []).map((e) => e.index)
  );
  await sheetsMarkEmail(
    batch.map((l, i) => ({ row: l.row, state: failedIdx.has(i) ? "erro" : "true", at }))
  );
  const failed = failedIdx.size;
  return {
    ...base,
    attempted: batch.length,
    sent: batch.length - failed,
    failed,
    remaining: todo.length - batch.length,
  };
}
