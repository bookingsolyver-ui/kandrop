"use client";

import { useTranslations } from "next-intl";
import { priceMinor, type Currency, type SignupPlan } from "@/shared/subscribe/schemas";
import { PLAN_FEATURES } from "./plans";
import { useSubscribeMoney } from "./useSubscribeMoney";

const Tick = () => (
  <svg
    aria-hidden
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="mt-0.5 shrink-0 text-accent"
  >
    <path d="m3.5 8.5 3 3 6-7" />
  </svg>
);

/**
 * The purchase at a glance: the plan, what it includes (a check list) and the total. Sticky beside
 * the form from `lg`; on phones the list is left out (the form is what matters there) and only the
 * plan and total show, above it.
 */
export function OrderSummary({
  plan,
  currency,
  onChange,
}: {
  plan: SignupPlan;
  currency: Currency;
  onChange?: () => void;
}) {
  const t = useTranslations("Subscribe");
  const features = useTranslations("Marketing.pricing");
  const money = useSubscribeMoney();
  const price = money(priceMinor(plan, currency), currency);

  return (
    <aside
      aria-labelledby="summary-title"
      className="rounded-lg border border-line bg-surface p-5 sm:p-6 lg:sticky lg:top-6"
    >
      <h2
        id="summary-title"
        className="text-[11px] font-medium tracking-[0.16em] text-ink-muted uppercase"
      >
        {t("summary.title")}
      </h2>
      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <p className="font-serif text-[1.5rem] leading-tight font-medium">
            {t("summary.plan", { plan: t(`plan.names.${plan}`) })}
          </p>
          <p className="mt-0.5 text-[13px] text-ink-muted">{t("summary.billing")}</p>
        </div>
        {onChange && (
          <button
            type="button"
            onClick={onChange}
            className="min-h-11 shrink-0 rounded px-1 text-[13px] text-ink-2 underline underline-offset-4 hover:text-ink"
          >
            {t("summary.change")}
          </button>
        )}
      </div>

      <ul className="mt-5 hidden space-y-3 text-[14px] lg:block">
        {PLAN_FEATURES[plan].map((feature) => (
          <li key={feature.key} className="flex items-start gap-3">
            <Tick />
            <span className="text-ink-2">
              {features(`features.${feature.key}`, { count: feature.count ?? 0 })}
              {feature.soon && (
                <span className="ml-2 rounded-full border border-line px-2 py-px text-[10px] font-medium tracking-wide whitespace-nowrap text-ink-muted uppercase">
                  {t("plan.soon")}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-line pt-4">
        <p className="text-sm font-semibold">{t("summary.total")}</p>
        <p className="text-[1.5rem] leading-none font-semibold tracking-tight tabular-nums">
          {price}
        </p>
      </div>
    </aside>
  );
}
