"use client";

import { useFormatter } from "next-intl";

/** Locale-aware formatting for dashboard values. All money arrives as integer minor units. */
export function useFormatters() {
  const format = useFormatter();

  return {
    money: (minor: number) =>
      format.number(minor / 100, {
        style: "currency",
        currency: "AOA",
        currencyDisplay: "narrowSymbol",
        maximumFractionDigits: 0,
      }),
    compact: (minor: number) =>
      format.number(minor / 100, {
        notation: "compact",
        maximumFractionDigits: 1,
      }),
    percent: (ratio: number, digits = 1) =>
      format.number(ratio, { style: "percent", maximumFractionDigits: digits }),
    signedPercent: (pct: number) =>
      format.number(pct / 100, {
        style: "percent",
        signDisplay: "exceptZero",
        maximumFractionDigits: 1,
      }),
    integer: (n: number) => format.number(n),
    /** `date` is a UTC calendar day, `YYYY-MM-DD`. */
    day: (date: string) =>
      format.dateTime(new Date(`${date}T00:00:00Z`), {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }),
    time: (iso: string) => format.dateTime(new Date(iso), { timeStyle: "medium" }),
  };
}
