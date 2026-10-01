"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { cutoffInfo } from "@/shared/fulfilment/deliveryDate";
import { ClockIcon } from "./icons";

/**
 * A quiet, REAL delivery cut-off: before 16:00 (Luanda) it counts down to it ("order within 3h 12m to receive it
 * tomorrow"), after it says delivery is in 24/48 working hours. It starts from the server's clock and a monotonic timer,
 * so a wrong clock on the shopper's phone cannot change it (and the first render matches the server's).
 */
export function DeliveryCutoff({ now }: { now: string }) {
  const t = useTranslations("Storefront.page.cutoff");
  const locale = useLocale();
  const start = Date.parse(now);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const began = performance.now();
    const timer = setInterval(() => setElapsed(performance.now() - began), 15_000);
    return () => clearInterval(timer);
  }, []);

  const info = cutoffInfo(start + elapsed);
  const hours = Math.floor(info.msLeft / 3_600_000);
  const minutes = Math.floor((info.msLeft % 3_600_000) / 60_000);
  const day = info.nextDay;
  // "tomorrow" only when the next delivery day really is tomorrow (Sundays are skipped): otherwise name the weekday.
  const todayIso = new Date(start + elapsed + 3_600_000).toISOString().slice(0, 10);
  const isTomorrow = Date.parse(`${day}T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`) === 86_400_000;
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(Date.parse(`${day}T00:00:00Z`));

  return (
    <p className="flex items-start gap-2.5 rounded-xl bg-page px-3.5 py-3 text-[13px] leading-snug text-ink-2">
      <ClockIcon width={18} height={18} className="mt-px shrink-0 text-ink-muted" />
      <span>{info.before ? t(isTomorrow ? "beforeTomorrow" : "beforeDay", { hours, minutes, day: weekday }) : t("after")}</span>
    </p>
  );
}
