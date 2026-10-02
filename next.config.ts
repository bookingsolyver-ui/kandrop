import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// next-intl resolves this RELATIVE path from the folder the build is launched in (Turbopack rejects
// absolute paths, and process.chdir() is unavailable while the config loads), so `next build` must run
// from the project folder: on a hosting platform, set the "Root Directory" to this folder (see
// docs/DEPLOY.md). Launched from anywhere else it fails with "Could not find i18n config".
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * COMING SOON mode: on the PUBLIC domain only, every public page is redirected (307, temporary) to the waitlist.
 *  - Which hosts: `COMING_SOON_HOSTS` (comma list, default `kandrop.com,www.kandrop.com`). Any other host, such as
 *    the `*.vercel.app` URLs, localhost and previews, is NOT redirected, so the team can test the whole app.
 *  - On in production builds unless `COMING_SOON=false` (which opens the site); `COMING_SOON=true` forces it on.
 *  - Bypass on the public domain: set `COMING_SOON_BYPASS_KEY` and open `/api/preview?key=<that key>` once: it sets a
 *    private cookie and the browser then sees the real site (`/api/preview?off=1` removes it).
 * Read at BUILD time: change a value and redeploy. Always reachable: `/api`, `/_next`, files with an extension and
 * the operators' door, `/login` and `/admin` (with or without the language prefix).
 */
const WAITLIST = "https://kandrop-waitlist.vercel.app/?ref=226M";
const comingSoon = process.env.COMING_SOON === "true" || (process.env.NODE_ENV === "production" && process.env.COMING_SOON !== "false");
const OPEN = "api(?:/|$)|_next(?:/|$)|_vercel(?:/|$)|[^/]*\\.[^/]*$|(?:(?:pt|en|fr)/)?(?:login|admin)(?:/|$)";
const HOSTS = (process.env.COMING_SOON_HOSTS ?? "kandrop.com,www.kandrop.com")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter((h) => /^[a-z0-9.-]+$/.test(h))
  .map((h) => h.replace(/\./g, "\\."))
  .join("|");
/** The cookie value is a hash of the key, so the key itself is not written into the build output. */
const BYPASS = process.env.COMING_SOON_BYPASS_KEY ? createHash("sha256").update(`kandrop-preview:${process.env.COMING_SOON_BYPASS_KEY}`).digest("hex") : null;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // A product image (at most 2 MB, checked on the server) travels inside the Server Action's form data.
  // `staleTimes` 0: the browser's Router Cache never reuses a page between navigations, so one person's dashboard (store
  // name, balances) is never replayed to the next person who signs in on the same browser.
  experimental: { serverActions: { bodySizeLimit: "3mb" }, staleTimes: { dynamic: 0, static: 0 } },
  // Pin the project root: a stray lockfile in a parent folder must never change what is bundled.
  turbopack: { root: fileURLToPath(new URL(".", import.meta.url)) },
  async redirects() {
    if (!comingSoon || !HOSTS) return [];
    const scope = {
      has: [{ type: "host" as const, value: `(?:${HOSTS})` }],
      ...(BYPASS ? { missing: [{ type: "cookie" as const, key: "kandrop_preview", value: BYPASS }] } : {}),
    };
    return [
      { source: "/", destination: WAITLIST, permanent: false, ...scope },
      { source: `/:path((?!${OPEN}).+)`, destination: WAITLIST, permanent: false, ...scope },
    ];
  },
  // SSE responses must never be buffered or compressed by the platform.
  async headers() {
    return [
      {
        // Safe on every response. (A CSP belongs to the host / proxy: see docs/DEPLOY.md.)
        // The referrer policy matters: checkout URLs carry the session id in the query string.
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          // Force HTTPS for two years, on every subdomain. Browsers ignore it over plain http (local dev).
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // DENY (stricter than SAMEORIGIN): nothing of ours is meant to be framed, not even by ourselves.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Every page that depends on who is signed in (merchant, admin, supplier, the shopper's own order): never stored by
        // a shared cache, and always keyed by the session cookie.
        source: "/:locale/(dashboard|admin|fornecedor|pedido)/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
          { key: "Vary", value: "Cookie" },
        ],
      },
      {
        source: "/api/dashboard/stream",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-transform" },
          { key: "X-Accel-Buffering", value: "no" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
