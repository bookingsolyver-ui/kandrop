/**
 * Cliente do webhook n8n (PRD secção 8).
 *
 * - Sem `N8N_WEBHOOK_URL` configurada → **mock** (M3): deduplica por número,
 *   gera código de 4 caracteres, atribui posição, valida `ref` e incrementa
 *   convites válidos em memória do servidor.
 * - Com URL configurada → POST real com `X-Webhook-Secret`, timeout de 8s e
 *   **uma** retry com o MESMO `requestId` (idempotência) antes de devolver 503.
 *
 * O browser nunca liga ao n8n — só a Route Handler (NFR-03).
 */

import type { WaitlistData } from "@/waitlist/lib/validation";

export interface SignupRequest extends WaitlistData {
  requestId: string;
  ref: string | null;
  utm: { source: string | null; medium: string | null; campaign: string | null };
  device: string;
}

export interface SignupSuccess {
  status: "created" | "duplicate";
  code: string;
  position: number;
  validInvites: number;
  shareUrl: string;
}

export type SignupResult =
  | SignupSuccess
  | { status: "invalid"; errors: Record<string, string> }
  | { status: "unavailable" };

/* ─── Mock (M3) — estado em memória do processo do servidor ─── */

interface MockRow {
  code: string;
  whatsapp: string;
  position: number;
  validInvites: number;
}

// Simula o Sheets. Em M4 é substituído pelo workflow n8n (proc. em série).
const rows = new Map<string, MockRow>(); // whatsapp → row
const byCode = new Map<string, MockRow>(); // code → row
const byRequestId = new Map<string, SignupSuccess>(); // idempotência

// Alfabeto sem caracteres ambíguos (sem 0/O, 1/I/l) — 4 caracteres ≈ 800k combinações
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LEN = 4;

function genCode(): string {
  for (let attempt = 0; attempt < 100; attempt++) {
    let code = "";
    const bytes = new Uint8Array(CODE_LEN);
    crypto.getRandomValues(bytes);
    for (const b of bytes) code += ALPHABET[b % ALPHABET.length];
    if (!byCode.has(code)) return code;
  }
  throw new Error("code space exhausted");
}

/**
 * Base dos links de partilha. Ordem:
 * 1. `NEXT_PUBLIC_BASE_URL` quando não é localhost (domínio próprio/staging)
 * 2. `VERCEL_PROJECT_PRODUCTION_URL` (alias de produção, automático na Vercel)
 * 3. `VERCEL_URL` (URL do deployment) se não houver env
 * 4. env localhost ou ausente → desenvolvimento local
 * Na Vercel nunca devolve localhost — produção tem de partilhar link real.
 */
export function baseUrl(): string {
  const strip = (v: string) => v.replace(/\/$/, "");
  const isLocal = (v?: string) =>
    !v || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(strip(v));
  const fromEnv = process.env.NEXT_PUBLIC_BASE_URL;
  if (fromEnv && !isLocal(fromEnv)) return strip(fromEnv);
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod}`;
  if (!fromEnv && process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (fromEnv) return strip(fromEnv);
  return "http://localhost:3000";
}

function mockSubmit(req: SignupRequest): SignupSuccess {
  // Idempotência: repetir requestId nunca cria segunda linha (PRD 8)
  const replay = byRequestId.get(req.requestId);
  if (replay) return replay;

  const existing = rows.get(req.whatsapp);
  if (existing) {
    const res: SignupSuccess = {
      status: "duplicate",
      code: existing.code,
      position: existing.position,
      validInvites: existing.validInvites,
      shareUrl: `${baseUrl()}/?ref=${existing.code}`,
    };
    byRequestId.set(req.requestId, res);
    return res;
  }

  const code = genCode();
  const row: MockRow = {
    code,
    whatsapp: req.whatsapp,
    position: rows.size + 1,
    validInvites: 0,
  };

  // Validação do ref: existe? não é o próprio? (FR-22 / contrato n8n)
  if (req.ref) {
    const owner = byCode.get(req.ref.toUpperCase());
    // Auto-indicação (mesmo número) não conta (FR-22)
    if (owner && owner.whatsapp !== req.whatsapp) owner.validInvites += 1;
  }

  rows.set(req.whatsapp, row);
  byCode.set(code, row);

  const res: SignupSuccess = {
    status: "created",
    code,
    position: row.position,
    validInvites: row.validInvites,
    shareUrl: `${baseUrl()}/?ref=${code}`,
  };
  byRequestId.set(req.requestId, res);
  return res;
}

/* ─── Envio (mock ou real) ─── */

/**
 * Estado para `GET /api/status` e `GET /api/stats` (FR-18, FR-19).
 * Em modo mock vem tudo do `rows`; em modo real, cada resposta do n8n actualiza
 * aqui (posição/convites podem crescer com o tempo). Em produção multi-instância
 * isto é memória por processo — como o rate limit, precisa de armazenamento
 * partilhado (ou dos webhooks `N8N_STATUS_URL`/`N8N_STATS_URL`) antes do M7.
 */
export interface StatusInfo {
  code: string;
  position: number;
  validInvites: number;
}

const seen = new Map<string, StatusInfo>(); // código → estado actual
let createdTotal = 0; // só códigos ainda não vistos (nunca inflaciona)

export function recordStatus(info: StatusInfo): void {
  if (!seen.has(info.code)) createdTotal += 1;
  seen.set(info.code, info);
}

export function lookupStatus(code: string): StatusInfo | null {
  const c = code.toUpperCase();
  const mock = byCode.get(c);
  if (mock) return { code: c, position: mock.position, validInvites: mock.validInvites };
  return seen.get(c) ?? null;
}

export function signupCount(): number {
  if (!process.env.N8N_WEBHOOK_URL) return rows.size;
  return createdTotal;
}

export async function sendSignup(req: SignupRequest): Promise<SignupResult> {
  const url = process.env.N8N_WEBHOOK_URL;

  if (!url) {
    // Mock SÓ em desenvolvimento. Em produção (Vercel/build) a falta da URL é
    // erro de configuração: nunca devolver "sucesso" sem n8n — a inscrição
    // tinha de ir para a folha (FR-16 / NFR-03).
    if (process.env.VERCEL || process.env.NODE_ENV === "production") {
      console.error(
        "[waitlist] N8N_WEBHOOK_URL em falta — a recusar em produção (503)",
      );
      return { status: "unavailable" };
    }
    return mockSubmit(req);
  }

  const secret = process.env.N8N_WEBHOOK_SECRET;
  const attempt = async (): Promise<SignupResult> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { "X-Webhook-Secret": secret } : {}),
        },
        body: JSON.stringify(req),
        signal: ctrl.signal,
      });
      if (res.status === 400) {
        const body = (await res.json().catch(() => null)) as {
          errors?: Record<string, string>;
        } | null;
        return { status: "invalid", errors: body?.errors ?? {} };
      }
      if (!res.ok) return { status: "unavailable" };
      const body = await res.json();
      return body as SignupSuccess;
    } catch {
      return { status: "unavailable" };
    } finally {
      clearTimeout(timer);
    }
  };

  const first = await attempt();
  // Uma retry com o MESMO requestId antes de devolver 503 (PRD 8)
  if (first.status === "unavailable") return attempt();
  return first;
}
