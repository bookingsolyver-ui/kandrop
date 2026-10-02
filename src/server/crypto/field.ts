import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getEnv } from "@/server/config/env";

/**
 * Field-level encryption for personal and financial data at rest (IBAN, tax numbers): AES-256-GCM,
 * a fresh 96-bit IV per value and the 128-bit authentication tag, stored as
 * `enc:v1:<iv>:<tag>:<ciphertext>` (base64url). The `context` (e.g. "bank_accounts.iban:sto_123") is
 * bound in as additional authenticated data, so a ciphertext copied to another row or column does
 * not decrypt.
 *
 * Key: `DATA_ENCRYPTION_KEY`, 32 random bytes in base64 (`openssl rand -base64 32`). Without it values
 * are stored as they are and a warning is logged once, so a deployment that has not set it yet keeps
 * working; set it and every value written from then on is encrypted. Values written before that stay
 * readable (no `enc:v1:` prefix = legacy plaintext) and are encrypted the next time they are saved.
 * Losing the key loses the data: back it up apart from the database.
 */
const PREFIX = "enc:v1:";
const g = globalThis as unknown as { __kandropWarnedNoKey?: boolean; __kandropUndecryptable?: Set<string> };

function key(): Buffer | null {
  const raw = getEnv().DATA_ENCRYPTION_KEY;
  if (!raw) {
    if (!g.__kandropWarnedNoKey) {
      g.__kandropWarnedNoKey = true;
      console.warn("[crypto] DATA_ENCRYPTION_KEY is not set: IBANs and tax numbers are stored UNENCRYPTED");
    }
    return null;
  }
  const bytes = Buffer.from(raw, "base64");
  if (bytes.length !== 32) throw new Error("DATA_ENCRYPTION_KEY must be 32 bytes in base64");
  return bytes;
}

export const isEncrypted = (value: string) => value.startsWith(PREFIX);

export function encryptField(plain: string, context: string): string {
  const k = key();
  if (!k) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  cipher.setAAD(Buffer.from(context));
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `${PREFIX}${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${data.toString("base64url")}`;
}

/** Plaintext (legacy) values pass through; a tampered or mis-bound ciphertext throws. */
export function decryptField(stored: string, context: string): string {
  if (!isEncrypted(stored)) return stored;
  const k = key();
  if (!k) throw new Error("Encrypted data found but DATA_ENCRYPTION_KEY is not set");
  const [iv, tag, data] = stored.slice(PREFIX.length).split(":");
  if (!iv || !tag || !data) throw new Error("Malformed encrypted field");
  const decipher = createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

export const encryptNullable = (v: string | null, ctx: string) => (v === null ? null : encryptField(v, ctx));
export const decryptNullable = (v: string | null, ctx: string) => (v === null ? null : decryptField(v, ctx));

/**
 * For READING a value to show or use: if it cannot be decrypted (the key was changed, or the value was
 * written with another environment's key) the answer is `null` and the failure is logged (never the
 * value), instead of an exception that takes the whole page down. A missing or unreadable value is then
 * simply "not there", and the person is asked to enter it again.
 */
export function tryDecryptField(stored: string, context: string): string | null {
  try {
    return decryptField(stored, context);
  } catch (err) {
    // Once per value (per process), not once per read: a supplier page reads the same row many times a minute,
    // and a stale value would otherwise bury the log. The context names a row, never the value.
    const seen = (g.__kandropUndecryptable ??= new Set<string>());
    if (!seen.has(context)) {
      seen.add(context);
      console.error("[crypto] could not decrypt a stored value (wrong or changed DATA_ENCRYPTION_KEY?)", { context: context.split(":")[0] }, err instanceof Error ? err.message : err);
    }
    return null;
  }
}

export const tryDecryptNullable = (v: string | null, ctx: string) => (v === null ? null : tryDecryptField(v, ctx));
