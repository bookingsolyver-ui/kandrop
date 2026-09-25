"use client";

import { useTranslations } from "next-intl";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { PLAN_KEYS, PLAN_PRICES, type PlanKey } from "@/server/modules/plan/limits";
import { PLAN_FEATURES } from "./plans";

const HIGHLIGHT: PlanKey = "pro";

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

/** Step 1: the two plan cards. Pro is the recommended one and carries the neon edge. */
export function PlanStep({
  selected,
  onChoose,
}: {
  selected: PlanKey | null;
  onChoose: (plan: PlanKey) => void;
}) {
  const t = useTranslations("Subscribe");
  const features = useTranslations("Marketing.pricing");
  const names = useTranslations("Shell.plan.names");
  const f = useFormatters();

  return (
    <ul className="grid gap-5 md:grid-cols-2">
      {PLAN_KEYS.map((plan) => {
        const highlighted = plan === HIGHLIGHT;
        return (
          <li
            key={plan}
            className={`flex flex-col rounded-lg border bg-surface p-6 sm:p-8 ${
              highlighted ? "border-accent ring-1 ring-accent/40" : "border-line"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-serif text-[1.75rem] leading-tight font-medium tracking-tight">
                {names(plan)}
              </h2>
              {highlighted && (
                <span className="rounded-full border border-accent px-2.5 py-0.5 text-[12px] font-medium text-accent">
                  {t("plan.recommended")}
                </span>
              )}
            </div>
            <p className="mt-5 flex items-baseline gap-2 tabular-nums">
              <span className="text-[2.5rem] leading-none font-semibold tracking-tight">
                {f.money(PLAN_PRICES[plan] * 100)}
              </span>
              <span className="text-sm text-ink-muted">{t("plan.perMonth")}</span>
            </p>

            <ul className="mt-7 flex-1 space-y-3 text-[15px]">
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

            <button
              type="button"
              onClick={() => onChoose(plan)}
              aria-pressed={selected === plan}
              className={`mt-8 h-14 w-full rounded-md px-6 text-[1.0625rem] font-semibold transition-opacity hover:opacity-90 ${
                highlighted
                  ? "bg-action text-on-action"
                  : "border border-accent/70 text-accent hover:bg-accent/10"
              }`}
            >
              {t("plan.choose", { plan: names(plan) })}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
