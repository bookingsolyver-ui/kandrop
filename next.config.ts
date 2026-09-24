import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Pin the project root: a stray lockfile in a parent folder must never change what is bundled.
  turbopack: { root: fileURLToPath(new URL(".", import.meta.url)) },
  // SSE responses must never be buffered or compressed by the platform.
  async headers() {
    return [
      {
        // Safe on every response. (HSTS and a CSP belong to the host / proxy: see docs/DEPLOY.md.)
        // The referrer policy matters: checkout URLs carry the session id in the query string.
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
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
