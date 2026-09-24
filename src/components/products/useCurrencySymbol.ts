"use client";

import { useLocale } from "next-intl";
import { formatLocales, type Locale } from "@/i18n/routing";

/** `Kz`, taken from `Intl` for the current locale rather than typed by hand. */
export function useCurrencySymbol(): string {
  const locale = useLocale() as Locale;
  return (
    new Intl.NumberFormat(formatLocales[locale], {
      style: "currency",
      currency: "AOA",
      currencyDisplay: "narrowSymbol",
    })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? "AOA"
  );
}
