import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * scrypt (OWASP-recommended profile: N=2^15, r=8, p=3). Parameters are stored in the hash
 * string, so they can be raised later and old hashes still verify.
 * Format: `scrypt$N$r$p$<salt b64>$<hash b64>`
 */
const N = 2 ** 15;
const R = 8;
const P = 3;
const KEY_LEN = 32;
const MAX_MEM = 128 * 1024 * 1024;

function derive(password: string, salt: Buffer, n: number, r: number, p: number, len: number) {
  const options: ScryptOptions = { N: n, r, p, maxmem: MAX_MEM };
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, len, options, (err, key) =>
      err ? reject(err) : resolve(key)
    )
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P, KEY_LEN);
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !n || !r || !p || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await derive(password, Buffer.from(salt, "base64"), +n, +r, +p, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

let dummy: Promise<string> | undefined;

/**
 * Verifies against a throw-away hash so "unknown e-mail" costs as much time as "wrong
 * password", denying attackers a timing oracle for which addresses are registered.
 */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummy ??= hashPassword("kandrop-timing-equaliser");
  await verifyPassword(password, await dummy);
}
