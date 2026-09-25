"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useFormatters } from "@/components/dashboard/useFormatters";
import type { BillingOverview } from "@/server/modules/billing/schema";
import { PLAN_PRICES } from "@/server/modules/plan/limits";

type Meter = BillingOverview["usage"]["products"];

/** Amber from 80 %, red when full: the bar and the sentence both say it. */
const tone = (used: number, limit: number) =>
  used >= limit ? "bg-down" : used / limit >= 0.8 ? "bg-series-2" : "bg-accent";

function Usage({ text, meter }: { text: string; meter: Meter }) {
  const limit = meter.limit;
  return (
    <div>
      <p className="text-sm text-ink tabular-nums">{text}</p>
      {limit !== null && (
        <div
          role="meter"
          aria-label={text}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuenow={meter.used}
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"
        >
          <div
            className={`h-full rounded-full ${tone(meter.used, limit)}`}
            style={{ width: `${limit === 0 ? 0 : Math.min(100, (meter.used / limit) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * The plan the store is on and how much of it is used — the first thing on the page. Numbers are
 * the real ones (products counted, landing pages not built yet so zero) and the sentence is the
 * one the merchant reads: "0 of 5 landing pages used".
 */
export function CurrentPlan({ data }: { data: BillingOverview }) {
  const t = useTranslations("Billing.current");
  const names = useTranslations("Shell.plan.names");
  const f = useFormatters();
  const format = useFormatter();
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "long" });
  const { usage } = data;

  const line = (key: "landingPages" | "products") => {
    const meter = usage[key];
    return meter.limit === null
      ? t(`${key}Unlimited`, { used: f.integer(meter.used) })
      : t(key, { used: f.integer(meter.used), limit: f.integer(meter.limit) });
  };

  return (
    <section
      aria-labelledby="current-plan-title"
      className="grid gap-8 rounded-lg border border-line bg-surface p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] md:gap-14"
    >
      <div>
        <p className="text-[11px] font-medium tracking-[0.18em] text-accent uppercase">
          {t("label")}
        </p>
        <h2
          id="current-plan-title"
          className="mt-3 font-serif text-[clamp(2rem,4vw,2.75rem)] leading-tight font-normal tracking-[-0.01em]"
        >
          {t("name", { plan: names(data.plan) })}
        </h2>
        <p className="mt-2 text-ink-2">
          {t("active", {
            price: f.money(PLAN_PRICES[data.plan] * 100),
            date: date(data.periodEnd),
          })}
        </p>
      </div>

      <div role="group" aria-label={t("meters")} className="space-y-5 self-center">
        <Usage text={line("landingPages")} meter={usage.landingPages} />
        <Usage text={line("products")} meter={usage.products} />
      </div>
    </section>
  );
}
