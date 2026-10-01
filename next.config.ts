import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// next-intl resolves this RELATIVE path from the folder the build is launched in (Turbopack rejects
// absolute paths, and process.chdir() is unavailable while the config loads), so `next build` must run
// from the project folder: on a hosting platform, set the "Root Directory" to this folder (see
// docs/DEPLOY.md). Launched from anywhere else it fails with "Could not find i18n config".
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * COMING SOON mode: every public page is redirected (307, temporary) to the waitlist. On in production builds
 * unless `COMING_SOON=false`; `COMING_SOON=true` forces it elsewhere. Read at BUILD time: change it and redeploy.
 * Left reachable on purpose: `/api` (webhooks, sign-in calls), `/_next`, files with an extension (icons, images),
 * and the operators' door, `/login` and `/admin` (with or without the language prefix), so the team can still
 * sign in and work while the public site is closed.
 */
const WAITLIST = "https://kandrop-waitlist.vercel.app/?ref=226M";
const comingSoon = process.env.COMING_SOON === "true" || (process.env.NODE_ENV === "production" && process.env.COMING_SOON !== "false");
const OPEN = "api(?:/|$)|_next(?:/|$)|_vercel(?:/|$)|[^/]*\\.[^/]*$|(?:(?:pt|en|fr)/)?(?:login|admin)(?:/|$)";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // A product image (at most 2 MB, checked on the server) travels inside the Server Action's form data.
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  // Pin the project root: a stray lockfile in a parent folder must never change what is bundled.
  turbopack: { root: fileURLToPath(new URL(".", import.meta.url)) },
  async redirects() {
    if (!comingSoon) return [];
    return [
      { source: "/", destination: WAITLIST, permanent: false },
      { source: `/:path((?!${OPEN}).+)`, destination: WAITLIST, permanent: false },
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
