import { cookies } from "next/headers";
import { getEnv } from "../config/env";
import { ApiError } from "../http/errors";
import { hasAccess } from "./access";
import { verifySession } from "./jwt";
import type { Session } from "./types";

export type { Session } from "./types";

/** httpOnly cookie carrying the session JWT — unreachable from page scripts (XSS-safe). */
export const SESSION_COOKIE = "kandrop_session";

function tokenFromRequest(req: Request): string | undefined {
  const bearer = req.headers.get("authorization");
  if (bearer?.toLowerCase().startsWith("bearer ")) return bearer.slice(7).trim();

  const cookie = req.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return cookie?.slice(SESSION_COOKIE.length + 1);
}

/** A valid token wins; otherwise the development bypass (never in production) may apply. */
export async function resolveSession(token: string | undefined): Promise<Session | null> {
  if (token) {
    const session = await verifySession(token);
    if (session) return session;
  }
  const env = getEnv();
  if (env.AUTH_DEV_BYPASS && env.NODE_ENV !== "production") {
    return { userId: "usr_demo", storeId: "sto_demo", role: "owner" };
  }
  return null;
}

/**
 * For API route handlers. Every protected route goes through this single gate: a valid session,
 * AND an active paid subscription (`payment_required`, 402, otherwise). The few routes an unpaid
 * account must reach — who am I, start a payment — opt out with `{ allowUnpaid: true }`.
 */
export async function requireSession(
  req: Request,
  opts: { allowUnpaid?: boolean } = {}
): Promise<Session> {
  const session = await resolveSession(tokenFromRequest(req));
  if (!session) throw new ApiError("unauthenticated");
  if (!opts.allowUnpaid && !hasAccess(session)) throw new ApiError("payment_required");
  return session;
}

/** For Server Components / layouts (reads the cookie store instead of a Request). */
export async function readSession(): Promise<Session | null> {
  const store = await cookies();
  return resolveSession(store.get(SESSION_COOKIE)?.value);
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: getEnv().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}
