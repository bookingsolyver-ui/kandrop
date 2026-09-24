import { randomBytes, randomUUID } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { getEnv } from "../config/env";
import type { Session } from "./types";

const ISSUER = "kandrop";
const AUDIENCE = "kandrop-web";
const ALGORITHM = "HS256";

/** Session lifetime. Refresh-token rotation is the next step (needs persistent storage). */
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

const g = globalThis as unknown as { __kandropDevSecret?: string };

/**
 * Signing key. Production requires SESSION_SECRET (enforced in `getEnv`). In development a
 * random per-process secret is used when unset — sessions simply end on restart.
 */
function signingKey(): Uint8Array {
  const secret =
    getEnv().SESSION_SECRET ?? (g.__kandropDevSecret ??= randomBytes(32).toString("hex"));
  return new TextEncoder().encode(secret);
}

export async function signSession(session: Session): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  const token = await new SignJWT({ sto: session.storeId, role: session.role })
    .setProtectedHeader({ alg: ALGORITHM, typ: "JWT" })
    .setSubject(session.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(signingKey());
  return { token, expiresAt };
}

/** Returns the session for a valid token, or `null` for anything else (never throws). */
export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      algorithms: [ALGORITHM],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    const { sub, sto, role } = payload;
    if (typeof sub !== "string" || typeof sto !== "string") return null;
    if (role !== "owner" && role !== "staff") return null;
    return { userId: sub, storeId: sto, role };
  } catch {
    return null;
  }
}
