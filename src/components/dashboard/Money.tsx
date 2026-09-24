"use client";

import { useLocale } from "next-intl";

const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(locale: string) {
  let f = formatters.get(locale);
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "AOA",
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    });
    formatters.set(locale, f);
  }
  return f;
}

/**
 * Display-size money: the currency is set smaller and quieter than the amount, the way
 * statements and private-banking screens do it. Order and spacing follow the locale
 * (`Kz 1.234` in PT/EN, `1 234 Kz` in FR) because we render Intl's own parts.
 */
export function Money({ minor }: { minor: number }) {
  const parts = formatterFor(useLocale()).formatToParts(minor / 100);

  return (
    <>
      {parts.map((part, i) =>
        part.type === "currency" ? (
          <span key={i} className="text-[0.55em] font-medium tracking-normal opacity-60">
            {part.value}
          </span>
        ) : (
          <span key={i}>{part.value}</span>
        )
      )}
    </>
  );
}
