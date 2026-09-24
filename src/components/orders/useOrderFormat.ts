"use client";

import { useFormatter } from "next-intl";
import { formatPhone } from "@/components/checkout/formatInput";

/** Merchants are in Angola: show times in Luanda regardless of the device's own setting. */
const timeZone = "Africa/Luanda";

export function useOrderFormat() {
  const format = useFormatter();
  return {
    /** `24 set., 14:05` — compact, for table rows. */
    short: (iso: string) =>
      format.dateTime(new Date(iso), {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone,
      }),
    /** `24 de setembro de 2026, 14:05` — for the detail view. */
    long: (iso: string) =>
      format.dateTime(new Date(iso), { dateStyle: "long", timeStyle: "short", timeZone }),
    /** `+244 923 411 208` from the 9-digit national number. */
    phone: (national: string) => `+244 ${formatPhone(national)}`,
    /** `#1042`. */
    number: (n: number) => `#${n}`,
  };
}
