import { useFormatter } from "next-intl";

/** Money for server-rendered storefront pieces: always Intl, never hand-built (minor units in). */
export function useMoney() {
  const format = useFormatter();
  return (minor: number) =>
    format.number(minor / 100, {
      style: "currency",
      currency: "AOA",
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    });
}
