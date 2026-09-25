import { useFormatter } from "next-intl";
import type { Currency } from "@/shared/subscribe/schemas";

/** Amounts in the chosen currency, always through Intl (Kwanzas whole, euros and dollars with cents). */
export function useSubscribeMoney() {
  const format = useFormatter();
  return (minor: number, currency: Currency) =>
    format.number(minor / 100, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: currency === "AOA" ? 0 : 2,
      maximumFractionDigits: currency === "AOA" ? 0 : 2,
    });
}
