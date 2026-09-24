import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["pt", "en", "fr"],
  defaultLocale: "pt",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

/** Regional tags used for number/date/currency formatting (Angola-first). */
export const formatLocales: Record<Locale, string> = {
  pt: "pt-AO",
  en: "en-GB",
  fr: "fr-FR",
};
