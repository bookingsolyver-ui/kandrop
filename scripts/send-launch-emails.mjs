// Sends the "Kandrop is live" e-mail to the whole waitlist, one batch at a time, until nobody is left.
//
//   ADMIN_API_TOKEN=... node scripts/send-launch-emails.mjs https://www.kandrop.com            # dry run: counts only
//   ADMIN_API_TOKEN=... node scripts/send-launch-emails.mjs https://www.kandrop.com --send     # really sends
//   ADMIN_API_TOKEN=... node scripts/send-launch-emails.mjs https://www.kandrop.com --test me@example.com
//
// Safe to stop and run again: each lead is marked in the sheet (email_enviado) as soon as its batch is accepted.
const [site, ...flags] = process.argv.slice(2);
const token = process.env.ADMIN_API_TOKEN;
if (!site || !token) {
  console.error("Usage: ADMIN_API_TOKEN=... node scripts/send-launch-emails.mjs <https://site> [--send | --test address]");
  process.exit(1);
}
const send = flags.includes("--send");
const testTo = flags.includes("--test") ? flags[flags.indexOf("--test") + 1] : undefined;
const BATCH = 50;
const PAUSE_MS = 2000; // well under Resend's 2 requests per second

const call = async (payload) => {
  const res = await fetch(`${site.replace(/\/$/, "")}/api/admin/waitlist/launch-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(out.error ?? out)}`);
  return out.data ?? out;
};

if (testTo) {
  console.log("test:", await call({ testTo }));
  process.exit(0);
}

let totalSent = 0;
let totalFailed = 0;
for (;;) {
  const r = await call({ send, limit: BATCH });
  if (!send) {
    console.log(`DRY RUN: ${r.pending} por enviar · ignorados:`, r.skipped, "· amostra:", r.preview);
    break;
  }
  totalSent += r.sent;
  totalFailed += r.failed;
  console.log(`lote: ${r.sent} enviados, ${r.failed} recusados · faltam ${r.remaining}`);
  if (r.remaining <= 0) break;
  await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
}
if (send) console.log(`Concluído: ${totalSent} enviados, ${totalFailed} recusados.`);
