/**
 * POST /api/waitlist — PRD secção 8 (FR-15, FR-16, FR-24).
 *
 * - Valida SEMPRE no servidor (FR-13) e normaliza o número (FR-12).
 * - Honeypot `website` preenchido → sucesso falso, nada gravado (FR-24).
 * - Limite por IP: 5 submissões/hora e 20 pedidos/minuto (FR-24).
 *   M3 usa memória do processo; em produção o contador tem de ser partilhado
 *   (Vercel WAF ou Upstash) — ver PRD 7 e checklist M7.
 * - Concorrência (PRD secção 13): envios ao n8n serializados POR NÚMERO —
 *   20 posts simultâneos do mesmo número criam 1 linha e respondem
 *   `created` + 19× `duplicate` (FR-16).
 * - `LAUNCH_MODE=launched` → 403 closed.
 * - Sanitização anti-injecção de Sheets: nome não pode começar por = + - @ (secção 13).
 * - Nunca faz log do número de WhatsApp (FR-24).
 */

import { NextResponse } from "next/server";
import { getLaunchMode } from "@/waitlist/lib/launch";
import {
  baseUrl,
  recordStatus,
  sendSignup,
  type SignupRequest,
  type SignupResult,
  type SignupSuccess,
} from "@/waitlist/lib/n8n";
import { captureAttributionServerSafe } from "@/waitlist/lib/referral-server";
import { sanitizeCell, sanitizeRef } from "@/waitlist/lib/sanitize";
import { validate, type FieldErrors } from "@/waitlist/lib/validation";

/* ─── Rate limit em memória (mock M3 — ver comentário no topo) ─── */

const hits = new Map<string, number[]>(); // ip → timestamps (ms)

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hour = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 3_600_000);
  const maxPerHour = Number(process.env.RATE_LIMIT_MAX_PER_HOUR ?? 5);
  const maxPerMinute = 20;
  const list = (hits.get(ip) ?? []).filter((t) => now - t < hour);
  const lastMinute = list.filter((t) => now - t < 60_000).length;
  if (list.length >= maxPerHour || lastMinute >= maxPerMinute) {
    hits.set(ip, list);
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  // Limpeza ocasional para não crescer sem limite
  if (hits.size > 10_000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= hour)) hits.delete(k);
    }
  }
  return false;
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return (fwd.split(",")[0] ?? "").trim() || "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

function deviceFrom(req: Request): string {
  const ua = req.headers.get("user-agent") ?? "";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

/* ─── Serialização por número (FR-16 · PRD secção 13 "Concorrência") ───
 *
 * O Google Sheets não é atómico e o n8n não tem fila por workflow: dois
 * POSTs simultâneos com o MESMO número fariam a mesma leitura "sem linha"
 * e criariam 2 linhas (aceitação M4: 20 simultâneos → 1 linha).
 *
 * Solução no caminho de produção: por número, só UMA chamada ao n8n corre de
 * cada vez; as restantes esperam pela anterior e reutilizam a resposta
 * (`created` → `duplicate`, comportamento FR-16). Números diferentes correm
 * em paralelo (latência intacta).
 *
 * Nota M7: em Vercel multi-instância isto é por instância — passar para
 * storage partilhado (Upstash) junto do rate limit.
 */

const phoneChains = new Map<string, Promise<SignupResult>>();
const phoneReplay = new Map<string, { body: SignupSuccess; expires: number }>();
const REPLAY_MS = 10_000; // janela para reutilizar resposta sem ir ao n8n

function saveReplay(phone: string, body: SignupSuccess): void {
  phoneReplay.set(phone, { body, expires: Date.now() + REPLAY_MS });
  if (phoneReplay.size <= 512) return;
  const now = Date.now();
  for (const [k, v] of phoneReplay) {
    if (v.expires <= now) phoneReplay.delete(k);
  }
}

async function sendSerialized(phone: string, payload: SignupRequest): Promise<SignupResult> {
  const prev = phoneChains.get(phone) ?? Promise.resolve(undefined);
  // Um erro na fila anterior nunca pode impedir a seguinte de correr.
  const slot: Promise<SignupResult> = prev
    .catch(() => undefined)
    .then(async () => {
      const cached = phoneReplay.get(phone);
      if (cached && cached.expires > Date.now()) {
        // Outro POST com o mesmo número acabou de receber a resposta do n8n →
        // devolve-a como duplicado, sem segunda chamada (FR-16).
        return cached.body.status === "created"
          ? { ...cached.body, status: "duplicate" as const }
          : cached.body;
      }
      const res = await sendSignup(payload);
      if (res.status === "created" || res.status === "duplicate") saveReplay(phone, res);
      return res;
    });
  phoneChains.set(phone, slot);
  try {
    return await slot;
  } finally {
    // Só limpa se este slot ainda for o fim da fila (havendo fila atrás,
    // a cadeia continua sozinha).
    if (phoneChains.get(phone) === slot) phoneChains.delete(phone);
  }
}

async function handlePost(req: Request) {
  if (getLaunchMode() === "launched") {
    return NextResponse.json({ status: "closed" }, { status: 403 });
  }

  const ip = clientIp(req);
  if (rateLimited(ip)) {
    return NextResponse.json({ status: "rate_limited" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { status: "invalid", errors: {} satisfies FieldErrors },
      { status: 400 }
    );
  }

  // Honeypot: preenchido → sucesso falso sem gravar (FR-24)
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({
      status: "created",
      code: "MOCK",
      position: 1,
      validInvites: 0,
      shareUrl: "",
    });
  }

  const result = validate(body);
  if (!result.ok) {
    return NextResponse.json({ status: "invalid", errors: result.errors }, { status: 400 });
  }

  const requestId =
    typeof body.requestId === "string" && /^[A-Za-z0-9-]{8,64}$/.test(body.requestId)
      ? body.requestId
      : crypto.randomUUID();

  const payload: SignupRequest = {
    ...result.data,
    name: sanitizeCell(result.data.name),
    email: sanitizeCell(result.data.email),
    requestId,
    ref: sanitizeRef(body.ref),
    utm: captureAttributionServerSafe(body.utm),
    device: deviceFrom(req),
  };

  const n8n = await sendSerialized(result.data.whatsapp, payload);

  // Sem PII no log: só requestId + estado (FR-24 / M4 debugging)
  console.info(`[waitlist] ${requestId} → ${(n8n as { status?: string }).status ?? "sem-status"}`);

  if (n8n.status === "invalid") {
    return NextResponse.json(n8n, { status: 400 });
  }
  if (n8n.status === "unavailable") {
    // `reason` é um código curto (not_configured, sheets_403, google_auth…): diz o que corrigir, sem expor segredos.
    return NextResponse.json(
      { status: "unavailable", reason: n8n.reason ?? "unknown" },
      { status: 503 }
    );
  }

  // Contrato secção 8: um 200 só vale se vier `status` + `code` (nós Respond do
  // n8n). Modo "Immediately" do Webhook (`{message:"Workflow was started"}`) não
  // serve — tratamos como indisponível para o utilizador NÃO receber sucesso
  // sem código/posição. Sem retry aqui: já houve um POST ao n8n.
  const ok = n8n as Partial<SignupSuccess> & Record<string, unknown>;
  if (typeof ok.status !== "string" || typeof ok.code !== "string") {
    console.warn(`[waitlist] ${requestId} → resposta fora do contrato (falta nó Respond no n8n)`);
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }

  // O n8n pode omitir `shareUrl` (na prática vem "") — a API compõe-a com
  // baseUrl(), que na Vercel nunca devolve localhost (ver lib/n8n.ts)
  const shareUrl = ok.shareUrl ? String(ok.shareUrl) : `${baseUrl()}/?ref=${ok.code}`;

  // Alimenta GET /api/status e GET /api/stats (FR-18, FR-19)
  recordStatus({
    code: ok.code,
    position: Number(ok.position) || 0,
    validInvites: Number(ok.validInvites) || 0,
  });

  return NextResponse.json(
    {
      status: ok.status,
      code: ok.code,
      position: Number(ok.position) || 0,
      validInvites: Number(ok.validInvites) || 0,
      shareUrl,
    },
    { status: 200 }
  );
}

/**
 * Rede de segurança: qualquer exceção inesperada (credenciais, rede, bug) vira uma resposta JSON 503 com a causa
 * registada no log, em vez de um erro opaco da plataforma sem rasto.
 */
export async function POST(req: Request) {
  try {
    return await handlePost(req);
  } catch (err) {
    console.error("[waitlist] erro inesperado:", err instanceof Error ? err.message : err);
    return NextResponse.json({ status: "unavailable", reason: "internal" }, { status: 503 });
  }
}
