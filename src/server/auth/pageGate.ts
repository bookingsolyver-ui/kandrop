import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { hasAccess } from "./access";
import { readSession, type Session } from "./session";

/**
 * For pages of the merchant area (Server Components): the signed-in session, or a redirect —
 * to the login when there is none, to `/checkout` when there is one but nothing has been paid.
 * The API enforces the same rule on its own (`requireSession`), so this is the UI half of the gate.
 */
export async function requirePaidSession(locale: Locale): Promise<Session> {
  const session = await readSession();
  if (!session) return redirect({ href: "/login", locale });
  if (!hasAccess(session)) return redirect({ href: "/checkout", locale });
  return session;
}
