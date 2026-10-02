import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { isPrivatePath } from "./lib/meta-pixel";
import { hasAccess } from "./server/auth/access";
import { resolveSession, SESSION_COOKIE } from "./server/auth/session";

// Next.js 16 renamed `middleware.ts` to `proxy.ts`. It does two things, in this order:
//  1. THE PAYMENT GATE for `/<locale>/dashboard/**`: before any page is rendered (and for the
//     background fetches of client-side navigation too), a request without a session goes to the
//     login and one without an active paid subscription goes to `/checkout`. The pages and the APIs
//     enforce the same rule on their own (`requirePaidSession`, `requireSession`); this is the first
//     door, so a dashboard page added later cannot forget it.
//  2. The first door of `/<locale>/admin/**`: no session → the login (and back to /admin afterwards).
//     WHO may stay (the e-mail in `ADMIN_EMAILS`) is decided by the admin layout, the pages and
//     `requireAdmin`, which show the "restricted access" screen to anyone else.
//  3. THE CONTENT-SECURITY-POLICY: a fresh nonce per request; only scripts that carry it (and what
//     they load) run, so an injected inline script is inert. Next puts the nonce on its own scripts
//     when it sees it in the request's CSP, which is why every page is rendered per request
//     (`dynamic = "force-dynamic"` in the locale layout).
//  4. Locale negotiation (next-intl), for pages only — /api, assets and internals are excluded.
const intl = createMiddleware(routing);
const DASHBOARD = new RegExp(`^/(${routing.locales.join("|")})/dashboard(/|$)`);
const SUPPLIER = new RegExp(`^/(${routing.locales.join("|")})/fornecedor(/|$)`);
const SUPPLIER_PUBLIC = new RegExp(`^/(${routing.locales.join("|")})/fornecedor/(login|registo)/?$`);
const ADMIN = new RegExp(`^/(${routing.locales.join("|")})/admin(/|$)`);

const isDev = process.env.NODE_ENV === "development";

/** Everything the app loads comes from itself: fonts are self-hosted (next/font), images are ours, blob: or data:. */
function contentSecurityPolicy(nonce: string, pathname: string) {
  // The Meta Pixel (the platform's or a merchant's, so not tied to an env var) loads through our nonce'd snippet and sends
  // events to facebook.com. Only PUBLIC routes may talk to Meta: the panels keep the strict policy.
  const pixel = !isPrivatePath(pathname);
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Inline style ATTRIBUTES (gradients, sizes set from data) cannot carry a nonce; scripts are what matter for XSS.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data:${pixel ? " https://www.facebook.com" : ""}`,
    "font-src 'self'",
    `connect-src 'self'${isDev ? " ws: wss:" : ""}${pixel ? " https://www.facebook.com https://connect.facebook.net" : ""}`,
    "media-src 'self'",
    // `script-src` carries 'strict-dynamic' (which ignores 'self'), so the Web Push service worker needs its own rule.
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export default async function proxy(original: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce, original.nextUrl.pathname);
  const headers = new Headers(original.headers);
  headers.set("x-nonce", nonce);
  // The path of THIS request (set here, so a client cannot choose it): lets server components, like the ad pixel, skip private routes.
  headers.set("x-pathname", original.nextUrl.pathname);
  headers.set("Content-Security-Policy", csp);
  const request = new NextRequest(original, { headers });
  const response = await route(request);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

async function route(request: NextRequest) {
  const match = DASHBOARD.exec(request.nextUrl.pathname);
  if (match) {
    const session = await resolveSession(request.cookies.get(SESSION_COOKIE)?.value);
    // A supplier is not a merchant: the dashboard is not theirs.
    const destination = !session
      ? "login"
      : session.role === "supplier"
        ? "fornecedor"
        : (await hasAccess(session))
          ? null
          : "checkout";
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
  // The supplier portal: only a supplier session enters; a merchant is sent to their own dashboard.
  // (The sign-in and sign-up pages stay open to everyone.)
  const supplierArea = SUPPLIER.exec(request.nextUrl.pathname);
  if (supplierArea && !SUPPLIER_PUBLIC.test(request.nextUrl.pathname)) {
    const session = await resolveSession(request.cookies.get(SESSION_COOKIE)?.value);
    const destination = !session ? "fornecedor/login" : session.role === "supplier" ? null : "dashboard";
    if (destination) {
      const url = request.nextUrl.clone();
      url.pathname = `/${supplierArea[1]}/${destination}`;
      url.search = "";
      const response = NextResponse.redirect(url);
      response.headers.set("Cache-Control", "no-store");
      response.headers.set("X-Kandrop-Gate", destination);
      return response;
    }
  }
  const admin = ADMIN.exec(request.nextUrl.pathname);
  if (admin && !(await resolveSession(request.cookies.get(SESSION_COOKIE)?.value))) {
    const url = request.nextUrl.clone();
    url.pathname = `/${admin[1]}/login`;
    url.search = "?next=%2Fadmin";
    const response = NextResponse.redirect(url);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Kandrop-Gate", "login");
    return response;
  }
  return intl(request);
}

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
