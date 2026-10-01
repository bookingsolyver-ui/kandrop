"use client";

import { useLocale } from "next-intl";
import { formatAmount, KWZ } from "@/lib/money";

/**
 * Display-size money: the unit is set smaller and quieter than the amount, the way statements and
 * private-banking screens do it. Always `amount kwz`.
 */
export function Money({ minor }: { minor: number }) {
  const amount = formatAmount(minor, useLocale());

  return (
    <>
      <span>{amount}</span>
      <span className="ml-[0.3em] text-[0.55em] font-medium tracking-normal opacity-60">{KWZ}</span>
    </>
  );
}
