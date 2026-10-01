import type pt from "../messages/pt.json";
import type { routing } from "./i18n/routing";

// Makes t("key") type-checked against the Portuguese source-of-truth catalogue.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof pt;
  }
}

/** The Meta Pixel (`fbq`) is injected globally by Meta's snippet (see `components/analytics/MetaPixel.tsx`). */
declare global {
  interface Window {
    fbq?: ((command: string, ...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string };
    _fbq?: Window["fbq"];
    /** Events asked for before `fbq` existed; the pixel snippet replays them. */
    __metaPixelQueue?: Array<[string, ...unknown[]]> | null;
  }
}
