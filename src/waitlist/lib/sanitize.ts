/**
 * Sanitização anti-injecção de Google Sheets (PRD secção 13).
 * Vale para o mock e para o payload real que segue para o n8n — o n8n grava
 * estes valores na folha, por isso o valor já tem de chegar limpo.
 */

/** Valor que começa por `= + - @` ou tab/CR é prefixado com apóstrofo. */
export function sanitizeCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/**
 * Código de convite (FR-22): exatamente 4 alfanuméricos, maiúsculas.
 * Fora do formato → `null` (FR-23: referência inválida ignorada em silêncio).
 */
export function sanitizeRef(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim().toUpperCase();
  return /^[A-Z0-9]{4}$/.test(s) ? s : null;
}
