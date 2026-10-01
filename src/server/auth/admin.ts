import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getEnv } from "@/server/config/env";
import { userRepository } from "@/server/modules/auth/userRepository";
import { readSession, type Session } from "./session";

/**
 * Who may use the operator console (`/admin`): the accounts whose e-mail is listed in
 * `ADMIN_EMAILS`. Nobody is an admin by default, and a signed-in person who is not one gets the same
 * 404 as a page that does not exist. In development, the bypass user may enter (never in production).
 */
async function isAdmin(session: Session): Promise<boolean> {
  const env = getEnv();
  if (env.AUTH_DEV_BYPASS && env.NODE_ENV !== "production" && session.userId === "usr_demo") return true;
  const allowed = (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length === 0) {
    // The usual reason for a 404 on /admin: say so in the server log (never on the page).
    console.warn("[admin] /admin refused: ADMIN_EMAILS is not set, so nobody is an administrator");
    return false;
  }
  const user = await userRepository.findById(session.userId);
  const ok = !!user && allowed.includes(user.email.toLowerCase());
  if (!ok) console.warn("[admin] /admin refused: the signed-in account's e-mail is not in ADMIN_EMAILS");
  return ok;
}

/** For the pages of `/admin` (Server Components): the admin's session, a redirect to sign in, or a 404. */
export async function requireAdmin(locale: Locale): Promise<Session> {
  const session = await readSession();
  if (!session) return redirect({ href: "/login", locale });
  if (!(await isAdmin(session))) notFound();
  return session;
}
