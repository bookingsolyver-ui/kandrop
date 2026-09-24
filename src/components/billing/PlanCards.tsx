"use client";

import { useTranslations } from "next-intl";
import { TIERS } from "@/components/marketing/tiers";
import { useFormatters } from "@/components/dashboard/useFormatters";
import type { BillingOverview, PublicPlan } from "@/server/modules/billing/schema";
import type { PlanKey } from "@/server/modules/plan/limits";
import type { PaidPlan } from "@/shared/billing/schemas";

/** The most complete plan gets the neon edge: flat, no glow (see PRODUCT.md). */
const HIGHLIGHT: PlanKey = "scale";

const Check = () => (
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

function PlanCard({ plan, onChoose }: { plan: PublicPlan; onChoose: (plan: PaidPlan) => void }) {
  const t = useTranslations("Billing.plans");
  const features = useTranslations("Marketing.pricing");
  const names = useTranslations("Shell.plan.names");
  const f = useFormatters();
  const tier = TIERS.find((candidate) => candidate.key === plan.key)!;
  const highlighted = plan.key === HIGHLIGHT;
  const current = plan.action === "current" || plan.action === "renew";
  const paid = plan.key !== "starter";

  return (
    <li
      aria-current={current ? "true" : undefined}
      className={`relative flex flex-col rounded-lg border bg-surface p-6 sm:p-7 ${
        highlighted ? "border-accent ring-1 ring-accent/40" : "border-line"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-[1.625rem] leading-tight font-medium tracking-tight">
          {names(plan.key)}
        </h3>
        {highlighted ? (
          <span className="rounded-full border border-accent px-2.5 py-0.5 text-[12px] font-medium text-accent">
            {t("badge")}
          </span>
        ) : (
          current && (
            <span className="rounded-full border border-field px-2.5 py-0.5 text-[12px] font-medium text-ink-2">
              {t("current")}
            </span>
          )
        )}
      </div>

      <p className="mt-5 flex items-baseline gap-2 tabular-nums">
        <span className="text-[2.25rem] leading-none font-semibold tracking-tight">
          {paid ? f.money(plan.price) : t("free")}
        </span>
        {paid && <span className="text-sm text-ink-muted">{t("perMonth")}</span>}
      </p>
      {highlighted && current && (
        <p className="mt-2 text-[13px] font-medium text-accent">{t("current")}</p>
      )}

      <ul className="mt-6 flex-1 space-y-3 text-[15px]">
        {tier.features.map((feature) => (
          <li key={feature.key} className="flex items-start gap-3">
            <Check />
            <span className="text-ink-2">
              {features(`features.${feature.key}`, { count: feature.count ?? 0 })}
              {feature.soon && (
                <span className="ml-2 rounded-full border border-line px-2 py-px text-[10px] font-medium tracking-wide whitespace-nowrap text-ink-muted uppercase">
                  {t("soon")}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-7">
        {plan.action === "upgrade" || plan.action === "renew" ? (
          <button
            type="button"
            onClick={() => onChoose(plan.key as PaidPlan)}
            className={`h-12 w-full rounded-md px-5 text-[0.9375rem] font-semibold transition-opacity hover:opacity-90 ${
              highlighted || plan.action === "renew"
                ? "bg-action text-on-action"
                : "border border-accent/70 text-accent hover:bg-accent/10"
            }`}
          >
            {plan.action === "renew" ? t("renew") : t("upgrade")}
          </button>
        ) : (
          <p className="flex h-12 items-center justify-center rounded-md border border-line text-sm text-ink-muted">
            {plan.action === "current" ? t("current") : t("included")}
          </p>
        )}
      </div>
    </li>
  );
}

/** Starter next to the paid plans. What each button does depends on the plan you are on. */
export function PlanCards({
  plans,
  onChoose,
}: {
  plans: BillingOverview["plans"];
  onChoose: (plan: PaidPlan) => void;
}) {
  const t = useTranslations("Billing.plans");
  return (
    <section aria-labelledby="plans-title">
      <h2
        id="plans-title"
        className="font-serif text-[1.375rem] leading-tight font-medium tracking-tight"
      >
        {t("title")}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">{t("subtitle")}</p>
      <ul aria-label={t("label")} className="mt-5 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.key} plan={plan} onChoose={onChoose} />
        ))}
      </ul>
    </section>
  );
}
