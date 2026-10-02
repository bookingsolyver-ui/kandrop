/**
 * FR-12 / FR-13 — Selector de país, normalização e validação de WhatsApp.
 * Funções puras (sem dependências) — usadas no cliente e no servidor.
 *
 * Indicativos aceites (PRD FR-12): +244 (defeito), +351, +55, +44, +33, +1.
 * Outros indicativos: Pendente (defeito: só estes seis).
 */

export type CountryIso = "AO" | "MZ" | "BR" | "PT" | "US";

export const DIALS: Record<CountryIso, string> = {
  AO: "244",
  MZ: "258",
  BR: "55",
  PT: "351",
  US: "1",
};

export const DEFAULT_ISO: CountryIso = "AO";

/** Comprimento nacional típico — ajuda a detetar indicativo em colagem sem `+`. */
const NATIONAL_MAX: Record<CountryIso, number> = {
  AO: 9,
  MZ: 9,
  BR: 11,
  PT: 9,
  US: 10,
};

/** Chaves de erro — as mensagens vivem em copy.form.errors (PRD Anexo A). */
export type PhoneErrorKey = "phoneAoLength" | "phoneAoPrefix" | "phoneInvalid";

export interface PhoneOk {
  ok: true;
  /** Formato `+244923456789` (PRD FR-12 normalização). */
  e164: string;
  /** Só os dígitos nacionais. */
  national: string;
  /** País derivado do indicativo (guardado à parte). */
  country: CountryIso;
}

export interface PhoneErr {
  ok: false;
  error: PhoneErrorKey;
}

export type PhoneResult = PhoneOk | PhoneErr;

/** Formatação só para display: grupos de 3 (último grupo absorve resto se sobrar 1). */
export function formatNational(national: string): string {
  if (national.length <= 3) return national;
  const groups: string[] = [];
  for (let i = 0; i < national.length; i += 3) groups.push(national.slice(i, i + 3));
  if (groups.length > 1 && groups[groups.length - 1]?.length === 1) {
    const last = groups.pop() as string;
    groups[groups.length - 1] += last;
  }
  return groups.join(" ");
}

/**
 * Normaliza o valor colado/digitado e valida para o país seleccionado.
 * - Limpa espaços, hífenes, parênteses (PRD FR-12).
 * - Aceita prefixo `+244` / `00244`, mesmo com outro país seleccionado:
 *   se o número casar com um indicativo conhecido, o país muda (auto-detecção).
 * - Angola: 9 dígitos a começar por 9. Outros: 8 a 12 dígitos (PRD FR-12).
 */
export function normalizePhone(raw: string, iso: CountryIso): PhoneResult {
  const trimmed = (raw ?? "").trim();
  const hadPrefix = /^\+/.test(trimmed) || /^00\d/.test(trimmed);
  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!digits) {
    return { ok: false, error: iso === "AO" ? "phoneAoLength" : "phoneInvalid" };
  }

  let country = iso;

  // Prefixo explícito (+/00) → remove o indicativo que se seguir, known ou selecionado.
  if (hadPrefix) {
    const match = (Object.keys(DIALS) as CountryIso[])
      .filter((c) => digits.startsWith(DIALS[c]))
      .sort((a, b) => DIALS[b].length - DIALS[a].length)
      .find((c) => {
        const rest = digits.slice(DIALS[c].length);
        return rest.length >= 8 && rest.length <= 12;
      });
    if (match) {
      country = match;
      digits = digits.slice(DIALS[country].length);
    } else if (digits.startsWith(DIALS[country])) {
      digits = digits.slice(DIALS[country].length);
    }
  } else if (digits.startsWith(DIALS[country]) && digits.length > NATIONAL_MAX[country]) {
    // Colagem sem + mas mais longa que o nacional máximo → traz o indicativo.
    digits = digits.slice(DIALS[country].length);
  }

  // Angola: número com 0 inicial (ex.: 0923456789) → remove o 0.
  if (country === "AO" && digits.length === 10 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (country === "AO") {
    if (digits.length !== 9) return { ok: false, error: "phoneAoLength" };
    if (!digits.startsWith("9")) return { ok: false, error: "phoneAoPrefix" };
  } else if (digits.length < 8 || digits.length > 12) {
    return { ok: false, error: "phoneInvalid" };
  }

  return { ok: true, e164: `+${DIALS[country]}${digits}`, national: digits, country };
}
