import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next.js 16 renamed `middleware.ts` to `proxy.ts`.
// Locale negotiation applies to pages only — /api, assets and internals are excluded.
export default createMiddleware(routing);

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
