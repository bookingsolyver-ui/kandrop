"use client";

import { useTranslations } from "next-intl";
import { CURRENCIES, type Currency } from "@/shared/subscribe/schemas";

/** Deliberately quiet: three small labels in a hairline pill. The current one is filled. */
export function CurrencyToggle({
  value,
  onChange,
}: {
  value: Currency;
  onChange: (currency: Currency) => void;
}) {
  const t = useTranslations("Subscribe.currency");
  return (
    <div
      role="group"
      aria-label={t("label")}
      className="inline-flex rounded-full border border-line p-0.5 text-[13px]"
    >
      {CURRENCIES.map((currency) => (
        <button
          key={currency}
          type="button"
          aria-pressed={value === currency}
          onClick={() => onChange(currency)}
          className={`min-h-9 min-w-11 rounded-full px-3 font-medium transition-colors motion-reduce:transition-none ${
            value === currency ? "bg-accent text-on-action" : "text-ink-2 hover:text-ink"
          }`}
        >
          {t(currency)}
        </button>
      ))}
    </div>
  );
}
