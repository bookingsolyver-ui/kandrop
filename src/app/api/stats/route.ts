/**
 * GET /api/stats — PRD secção 8 (FR-19).
 * Devolve { total, showCounter } (showCounter = total >= 50).
 * Contador real, nunca inflacionado; cache de ~2 minutos.
 */

import { NextResponse } from "next/server";
import { signupCount } from "@/waitlist/lib/n8n";
import { sheetsConfigured, sheetsCount } from "@/waitlist/lib/sheets";

const CACHE = "public, max-age=60, s-maxage=120, stale-while-revalidate=180";

export async function GET() {
  if (sheetsConfigured()) {
    try {
      const total = await sheetsCount();
      return NextResponse.json(
        { total, showCounter: total >= 50 },
        { headers: { "Cache-Control": CACHE } }
      );
    } catch {
      return NextResponse.json({ status: "unavailable" }, { status: 503 });
    }
  }

  const upstream = process.env.N8N_STATS_URL;

  if (upstream) {
    try {
      const res = await fetch(upstream, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      });
      const body = (await res.json().catch(() => null)) as { total?: unknown } | null;
      if (!res.ok || !body || typeof body.total !== "number") {
        return NextResponse.json({ status: "unavailable" }, { status: 503 });
      }
      const total = body.total;
      return NextResponse.json(
        { total, showCounter: total >= 50 },
        { headers: { "Cache-Control": CACHE } }
      );
    } catch {
      return NextResponse.json({ status: "unavailable" }, { status: 503 });
    }
  }

  const total = signupCount();
  return NextResponse.json(
    { total, showCounter: total >= 50 },
    { headers: { "Cache-Control": CACHE } }
  );
}
