import { z } from "zod";

/**
 * Bank details, validated in the browser (instant feedback) and again on the server (the real
 * gate). Messages are stable CODES; the UI translates `Settings.bank.validation.<code>`.
 */
export type BankValidationCode =
  | "holder_required"
  | "holder_invalid"
  | "iban_required"
  | "iban_format"
  | "iban_checksum"
  | "password_required"
  /** Server verdict for a wrong current password. */
  | "password_incorrect";

const c = (code: BankValidationCode) => ({ error: code });

// ── Angolan IBAN ──────────────────────────────────────────────────────────────────────────

/** `AO` + 2 check digits + 21 digits (bank 4, branch 4, account 11, national check 2) = 25. */
export const IBAN_LENGTH = 25;
const IBAN_SHAPE = /^AO\d{23}$/;

/** Upper-case, no spaces or separators: how an IBAN is compared and stored. */
export const normalizeIban = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * Keeps the input a *valid prefix* of an Angolan IBAN as it is typed or pasted: the `AO` is
 * fixed, only digits are accepted after it, nothing beyond 25 characters, grouped in fours.
 */
export function formatIbanInput(raw: string): string {
  let value = normalizeIban(raw);
  if (value.startsWith("AO")) value = value.slice(2);
  const digits = value.replace(/\D/g, "").slice(0, IBAN_LENGTH - 2);
  return digits ? `AO${digits}`.replace(/(.{4})(?=.)/g, "$1 ") : "";
}

/**
 * ISO 7064 mod 97-10 — the check every IBAN carries. The two digits after `AO` are *derived*
 * from the account, so they differ from account to account (they are not always `06`).
 */
export function hasValidIbanChecksum(iban: string): boolean {
  if (!IBAN_SHAPE.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const value = ch >= "A" ? ch.charCodeAt(0) - 55 : Number(ch); // A=10 … Z=35
    remainder = Number(`${remainder}${value}`) % 97;
  }
  return remainder === 1;
}

/** `AO06 •••• •••• •••• •••• 1234`: enough to recognise the account, not to use it. */
export const maskIban = (iban: string) =>
  `${iban.slice(0, 4)} •••• •••• •••• •••• ${iban.slice(-4)}`;

export const ibanSchema = z
  .string(c("iban_required"))
  .transform(normalizeIban)
  .pipe(
    z
      .string()
      .min(1, c("iban_required"))
      .regex(IBAN_SHAPE, c("iban_format"))
      .refine(hasValidIbanChecksum, c("iban_checksum"))
  );

/**
 * Person or company name as a bank prints it: letters (any script, accented), digits, spaces and
 * the punctuation real names carry — "Loja Demo, Lda.", "A&B Comércio, S.A.", "D'Almeida".
 */
export const holderSchema = z
  .string(c("holder_required"))
  .trim()
  .min(1, c("holder_required"))
  .regex(/^[\p{L}\p{N}][\p{L}\p{N}\p{M} .,'’&()/-]{1,69}$/u, c("holder_invalid"));

export const bankAccountSchema = z.object({
  holderName: holderSchema,
  iban: ibanSchema,
  /** Re-authentication: changing where money goes is the classic account-takeover move. */
  password: z.string(c("password_required")).min(1, c("password_required")).max(128),
});
export type BankAccountInput = z.input<typeof bankAccountSchema>;

export function firstBankError(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>
): Record<string, BankValidationCode> {
  const out: Record<string, BankValidationCode> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !(field in out)) out[field] = issue.message as BankValidationCode;
  }
  return out;
}
