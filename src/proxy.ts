import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { hasAccess } from "./server/auth/access";
import { resolveSession, SESSION_COOKIE } from "./server/auth/session";

// Next.js 16 renamed `middleware.ts` to `proxy.ts`. It does two things, in this order:
//  1. THE PAYMENT GATE for `/<locale>/dashboard/**`: before any page is rendered (and for the
//     background fetches of client-side navigation too), a request without a session goes to the
//     login and one without an active paid subscription goes to `/checkout`. The pages and the APIs
//     enforce the same rule on their own (`requirePaidSession`, `requireSession`); this is the first
//     door, so a dashboard page added later cannot forget it.
//  2. Locale negotiation (next-intl), for pages only — /api, assets and internals are excluded.
const intl = createMiddleware(routing);
const DASHBOARD = new RegExp(`^/(${routing.locales.join("|")})/dashboard(/|$)`);

export default async function proxy(request: NextRequest) {
  const match = DASHBOARD.exec(request.nextUrl.pathname);
  if (match) {
    const session = await resolveSession(request.cookies.get(SESSION_COOKIE)?.value);
    const destination = !session ? "login" : hasAccess(session) ? null : "checkout";
    if (destination) {
      const url = request.nextUrl.clone();
      url.pathname = `/${match[1]}/${destination}`;
      url.search = "";
      const response = NextResponse.redirect(url);
      // Never cached (the answer changes the moment a payment is confirmed); the header is
      // there so the gate is observable in tests and logs.
      response.headers.set("Cache-Control", "no-store");
      response.headers.set("X-Kandrop-Gate", destination);
      return response;
    }
  }
  return intl(request);
}

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
