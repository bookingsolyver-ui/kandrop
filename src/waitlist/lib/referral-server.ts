/**
 * Helpers server-side do payload de inscrição (UTM chegam no corpo do pedido;
 * a captura em browser vive em lib/referral.ts — FR-23).
 */

import { sanitizeCell } from "@/waitlist/lib/sanitize";

interface Utm {
  source: string | null;
  medium: string | null;
  campaign: string | null;
}

/** Trim + limite de 120 + anti-injecção de Sheets (utm pode vir de URL). */
function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = sanitizeCell(v.trim().slice(0, 120));
  return t ? t : null;
}

export function captureAttributionServerSafe(raw: unknown): Utm {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    source: str(obj.source),
    medium: str(obj.medium),
    campaign: str(obj.campaign),
  };
}
