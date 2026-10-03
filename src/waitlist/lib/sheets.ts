import "server-only";
import { createSign } from "node:crypto";
import type { SignupRequest, SignupResult, SignupSuccess } from "@/waitlist/lib/n8n";

/**
 * Grava a lista de espera DIRETAMENTE no Google Sheets (sem n8n), com uma conta de serviço.
 *
 * Configuração (Vercel → Environment Variables, todas só no servidor):
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  email da conta de serviço (…@…iam.gserviceaccount.com)
 *   GOOGLE_PRIVATE_KEY            a "private_key" do JSON da conta (as quebras de linha podem vir como \n; aspas à volta são ignoradas)
 *   GOOGLE_SERVICE_ACCOUNT_JSON   (alternativa às duas acima) o conteúdo INTEIRO do ficheiro JSON da chave
 *   GOOGLE_SHEET_ID               id da folha (o texto entre /d/ e /edit no URL)
 *   GOOGLE_SHEET_TAB              (opcional) nome do separador; por omissão o primeiro
 * A folha tem de estar partilhada com o email da conta de serviço como Editor.
 *
 * Colunas — as da folha de produção (A–R), por esta ordem:
 *   id · created_at · name · email · whatsapp · country · profile · consent · consent_at · code · ref ·
 *   valid_invites · utm_source · utm_medium · utm_campaign · device · status · request_id
 * `id` é a posição na lista (1, 2, 3…); as datas são hora de Luanda (UTC+1) sem fuso, como as linhas que já lá estão;
 * `consent` é "sim" e `status` é "novo". As células são gravadas em modo RAW: nada é interpretado como fórmula.
 */

const HEADER = [
  "id",
  "created_at",
  "name",
  "email",
  "whatsapp",
  "country",
  "profile",
  "consent",
  "consent_at",
  "code",
  "ref",
  "valid_invites",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "device",
  "status",
  "request_id",
];
const LAST_COL = "R";
/** Posição (0-based) de cada coluna dentro de uma linha lida. */
const COL = { id: 0, whatsapp: 4, code: 9, invites: 11, requestId: 17 } as const;
/** Coluna do Sheets (letra) dos convites válidos. */
const INVITES_LETTER = "L";

/** Só os dígitos: o Sheets pode devolver +244… como número (244…) ou texto, e continua a ser o mesmo número. */
const digits = (v: string | undefined) => (v ?? "").replace(/\D/g, "");

/** Hora de Luanda (UTC+1) sem fuso, como as linhas que já estão na folha: 2026-10-02T00:31:05. */
const luandaNow = () => new Date(Date.now() + 3_600_000).toISOString().slice(0, 19);

/** Email + chave privada, venham das duas variáveis ou do JSON inteiro. A chave é limpa dos erros típicos de colagem. */
function credentials(): { email: string; key: string } | null {
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  let key = process.env.GOOGLE_PRIVATE_KEY;
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      const parsed = JSON.parse(json) as { client_email?: string; private_key?: string };
      email ||= parsed.client_email;
      key ||= parsed.private_key;
    } catch {
      console.error("[waitlist] GOOGLE_SERVICE_ACCOUNT_JSON não é JSON válido");
    }
  }
  if (!email || !key) return null;
  // Erros típicos ao colar na Vercel: aspas à volta, \n literais em vez de quebras de linha, espaços nas pontas.
  key = key
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "\n")
    .trim();
  return { email, key };
}

export function sheetsConfigured(): boolean {
  return Boolean(credentials() && process.env.GOOGLE_SHEET_ID?.trim());
}

const b64url = (input: string | Buffer) => Buffer.from(input).toString("base64url");

/* ─── OAuth (JWT bearer, RS256) ─── */

let cachedToken: { value: string; expires: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
  const { email, key } = credentials()!;
  if (!key.includes("BEGIN PRIVATE KEY"))
    throw new Error(
      "GOOGLE_PRIVATE_KEY não parece uma chave privada (falta -----BEGIN PRIVATE KEY-----)"
    );
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  )}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${b64url(signature)}`,
    }),
    signal: AbortSignal.timeout(8000),
  });
  const body = (await res.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  } | null;
  if (!res.ok || !body?.access_token)
    throw new Error(`google oauth ${res.status} ${body?.error ?? ""}`.trim());
  cachedToken = {
    value: body.access_token,
    expires: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID!.trim()}${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(8000),
    }
  );
  if (!res.ok) {
    // Sem corpo no log (pode ter dados); o código chega para distinguir 403 (folha não partilhada) de 404 (id errado).
    throw new Error(`sheets ${res.status} ${path.split("?")[0]}`);
  }
  return (await res.json()) as T;
}

let tabName: string | null = null;
async function tab(): Promise<string> {
  if (process.env.GOOGLE_SHEET_TAB) return process.env.GOOGLE_SHEET_TAB;
  if (tabName) return tabName;
  const meta = await api<{ sheets: Array<{ properties: { title: string } }> }>(
    "?fields=sheets.properties.title"
  );
  tabName = meta.sheets[0]?.properties.title ?? "Sheet1";
  return tabName;
}

const range = async (a1: string) =>
  encodeURIComponent(`'${(await tab()).replace(/'/g, "''")}'!${a1}`);

async function readRows(): Promise<string[][]> {
  const data = await api<{ values?: string[][] }>(
    `/values/${await range(`A:${LAST_COL}`)}?majorDimension=ROWS`
  );
  return data.values ?? [];
}

/* ─── Operações ─── */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genCode(taken: Set<string>): string {
  for (let attempt = 0; attempt < 100; attempt++) {
    const bytes = crypto.getRandomValues(new Uint8Array(4));
    const code = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
    if (!taken.has(code)) return code;
  }
  throw new Error("code space exhausted");
}

/** A posição de uma linha existente é o seu `id`; sem `id` legível, a ordem na folha. */
const positionOf = (row: string[], index: number) => Number(row[COL.id]) || index + 1;

const success = (
  status: "created" | "duplicate",
  row: string[],
  position: number,
  baseUrl: string
): SignupSuccess => ({
  status,
  code: row[COL.code] ?? "",
  position,
  validInvites: Number(row[COL.invites]) || 0,
  shareUrl: `${baseUrl}/?ref=${row[COL.code] ?? ""}`,
});

export async function sheetsSubmit(req: SignupRequest, baseUrl: string): Promise<SignupResult> {
  try {
    let rows = await readRows();
    if (rows.length === 0) {
      await api(`/values/${await range(`A1:${LAST_COL}1`)}?valueInputOption=RAW`, {
        method: "PUT",
        body: JSON.stringify({ values: [HEADER] }),
      });
      rows = [HEADER];
    }
    const data = rows.slice(1);

    // Idempotência (mesmo request_id) e duplicado (mesmo número): devolve a linha que já existe.
    const phone = digits(req.whatsapp);
    const index = data.findIndex(
      (r) => r[COL.requestId] === req.requestId || digits(r[COL.whatsapp]) === phone
    );
    if (index >= 0)
      return success("duplicate", data[index]!, positionOf(data[index]!, index), baseUrl);

    const code = genCode(new Set(data.map((r) => r[COL.code] ?? "")));
    const owner = req.ref
      ? data.findIndex((r) => r[COL.code] === req.ref && digits(r[COL.whatsapp]) !== phone)
      : -1;
    const lastId = data.reduce((max, r) => Math.max(max, Number(r[COL.id]) || 0), 0);
    const id = Math.max(lastId, data.length) + 1;
    const now = luandaNow();
    const row = [
      String(id),
      now,
      req.name,
      req.email,
      req.whatsapp,
      req.country,
      req.profile ?? "",
      "sim",
      now,
      code,
      owner >= 0 ? (req.ref ?? "") : "",
      "0",
      req.utm.source ?? "",
      req.utm.medium ?? "",
      req.utm.campaign ?? "",
      req.device,
      "novo",
      req.requestId,
    ];
    const appended = await api<{ updates?: { updatedRange?: string } }>(
      `/values/${await range(`A:${LAST_COL}`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      { method: "POST", body: JSON.stringify({ values: [row] }) }
    );
    // Se dois envios simultâneos tiveram o mesmo `id`, a linha onde o Sheets realmente gravou (atómico) manda.
    const written = Number(/!A(\d+)/.exec(appended.updates?.updatedRange ?? "")?.[1]);
    let position = id;
    if (Number.isFinite(written) && written >= 2 && written - 1 !== id) {
      position = written - 1;
      await api(`/values/${await range(`A${written}`)}?valueInputOption=RAW`, {
        method: "PUT",
        body: JSON.stringify({ values: [[String(position)]] }),
      }).catch(() => undefined);
    }

    // Convite válido para quem indicou. Falhar aqui nunca desfaz a inscrição.
    if (owner >= 0) {
      const sheetRow = owner + 2;
      const next = (Number(data[owner]![COL.invites]) || 0) + 1;
      await api(`/values/${await range(`${INVITES_LETTER}${sheetRow}`)}?valueInputOption=RAW`, {
        method: "PUT",
        body: JSON.stringify({ values: [[String(next)]] }),
      }).catch((e) =>
        console.warn("[waitlist] convite não atualizado:", e instanceof Error ? e.message : e)
      );
    }
    return success("created", row, position, baseUrl);
  } catch (err) {
    // Sem PII: só a causa técnica (ex.: "sheets 403 /values/…" = folha não partilhada com a conta de serviço).
    console.error("[waitlist] falha ao gravar na folha:", err instanceof Error ? err.message : err);
    return { status: "unavailable" };
  }
}

/** Estado de um código (para /api/status), lido da folha. */
export async function sheetsStatus(
  code: string
): Promise<{ code: string; position: number; validInvites: number } | null> {
  const data = (await readRows()).slice(1);
  const i = data.findIndex((r) => r[COL.code] === code);
  return i < 0
    ? null
    : { code, position: positionOf(data[i]!, i), validInvites: Number(data[i]![COL.invites]) || 0 };
}

/** Total de inscritos (para /api/stats). */
export async function sheetsCount(): Promise<number> {
  return Math.max(0, (await readRows()).length - 1);
}
