/**
 * FR-11 / FR-13 — validação do formulário, usada no cliente e sempre no servidor.
 * As mensagens vivem em copy.form.errors (PRD Anexo A: todo o texto em lib/copy.ts).
 */

import { copy } from "@/waitlist/lib/copy";
import { normalizePhone, type CountryIso, type PhoneErrorKey } from "@/waitlist/lib/phone";

export type FieldName = "name" | "email" | "whatsapp" | "consent";

export type FieldErrors = Partial<Record<FieldName, string>>;

export interface WaitlistInput {
  name?: unknown;
  email?: unknown;
  whatsapp?: unknown;
  country?: unknown;
  profile?: unknown;
  consent?: unknown;
  /** honeypot (FR-24) */
  website?: unknown;
}

export interface WaitlistData {
  name: string;
  email: string;
  /** `+244923456789` */
  whatsapp: string;
  /** ISO derivado do indicativo (FR-12) */
  country: CountryIso;
  profile: string | null;
  consent: true;
}

export type ValidationResult =
  | { ok: true; data: WaitlistData }
  | { ok: false; errors: FieldErrors };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const VALID_ISOS: CountryIso[] = ["AO", "MZ", "BR", "PT", "US"];
const VALID_PROFILES = new Set(["start_selling", "already_selling", "abroad"]);

const E = copy.form.errors;

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** Valida um campo em isolamento (blur no cliente). */
export function validateField(field: FieldName, input: WaitlistInput): string | undefined {
  const result = validate(input);
  return result.ok ? undefined : result.errors[field];
}

export function validate(input: WaitlistInput): ValidationResult {
  const errors: FieldErrors = {};

  // Nome: 2 a 80 caracteres, trim, sem apenas espaços (FR-11)
  const name = asString(input.name).trim().replace(/\s+/g, " ");
  if (name.length < 2) errors.name = E.name;
  else if (name.length > 80) errors.name = E.nameMax;

  // Email (acréscimo pedido pelo responsável)
  const email = asString(input.email).trim();
  if (!email) errors.email = E.emailRequired;
  else if (!EMAIL_RE.test(email) || email.length > 254) errors.email = E.emailInvalid;

  // WhatsApp: selector + normalização (FR-12)
  const iso = (VALID_ISOS.includes(input.country as CountryIso)
    ? input.country
    : "AO") as CountryIso;
  const phone = normalizePhone(asString(input.whatsapp), iso);
  if (!phone.ok) errors.whatsapp = mapPhoneError(phone.error);

  // Consentimento: obrigatório e nunca pré-marcado (FR-11)
  if (input.consent !== true) errors.consent = E.consent;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const profile = asString(input.profile);
  return {
    ok: true,
    data: {
      name,
      email,
      whatsapp: phone.ok ? phone.e164 : "",
      country: phone.ok ? phone.country : iso,
      profile: VALID_PROFILES.has(profile) ? profile : null,
      consent: true,
    },
  };
}

function mapPhoneError(key: PhoneErrorKey): string {
  return key === "phoneAoLength"
    ? E.phoneAoLength
    : key === "phoneAoPrefix"
      ? E.phoneAoPrefix
      : E.phoneInvalid;
}
