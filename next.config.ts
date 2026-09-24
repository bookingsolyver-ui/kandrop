import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // SSE responses must never be buffered or compressed by the platform.
  async headers() {
    return [
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
