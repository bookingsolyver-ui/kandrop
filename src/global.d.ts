import type pt from "../messages/pt.json";
import type { routing } from "./i18n/routing";

// Makes t("key") type-checked against the Portuguese source-of-truth catalogue.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof pt;
  }
}
