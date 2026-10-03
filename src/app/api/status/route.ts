/**
 * GET /api/status?code=XXXX — PRD secção 8 (FR-18).
 * Devolve { code, position, validInvites } para o ecrã de sucesso persistente.
 * Código inexistente → 404 (o frontend limpa o localStorage).
 * Nunca devolve nome nem número de WhatsApp.
 */

import { NextResponse } from "next/server";
import { lookupStatus } from "@/waitlist/lib/n8n";
import { sheetsConfigured, sheetsStatus } from "@/waitlist/lib/sheets";

const notFound = () => NextResponse.json({ status: "not_found" }, { status: 404 });

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z0-9]{4}$/.test(code)) return notFound();

  // Google Sheets direto: a folha é a fonte da verdade.
  if (sheetsConfigured()) {
    try {
      const info = await sheetsStatus(code);
      return info ? NextResponse.json(info) : notFound();
    } catch {
      return NextResponse.json({ status: "unavailable" }, { status: 503 });
    }
  }

  // Fonte externa opcional (webhook de leitura no n8n — leia a Fase C do checklist)
  const upstream = process.env.N8N_STATUS_URL;
  if (upstream) {
    try {
      const sep = upstream.includes("?") ? "&" : "?";
      const res = await fetch(`${upstream}${sep}code=${encodeURIComponent(code)}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      });
      if (res.status === 404) return notFound();
      if (!res.ok) return NextResponse.json({ status: "unavailable" }, { status: 503 });
      const body = (await res.json().catch(() => null)) as {
        position?: unknown;
        validInvites?: unknown;
      } | null;
      if (!body || typeof body.position !== "number") {
        return NextResponse.json({ status: "unavailable" }, { status: 503 });
      }
      return NextResponse.json({
        code,
        position: body.position,
        validInvites: Number(body.validInvites) || 0,
      });
    } catch {
      // Fonte configurada mas em baixo → 503 (o cliente mantém o snapshot local)
      return NextResponse.json({ status: "unavailable" }, { status: 503 });
    }
  }

  const info = lookupStatus(code);
  if (!info) return notFound();
  return NextResponse.json(info);
}
