import { useLocale } from "next-intl";
import { formatKwz } from "@/lib/money";

/** Money for the storefront pieces (minor units in): `22.500 kwz`. */
export function useMoney() {
  const locale = useLocale();
  return (minor: number) => formatKwz(minor, locale);
}
