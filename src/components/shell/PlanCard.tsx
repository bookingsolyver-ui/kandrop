"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { UpgradeIcon } from "./icons";
import { usePlan } from "./PlanProvider";

type Meter = { used: number; limit: number | null };

/** Amber from 80 %, red when full: the bar and the number both say it. */
const tone = ({ used, limit }: { used: number; limit: number }) =>
  used >= limit ? "bg-down" : used / limit >= 0.8 ? "bg-series-2" : "bg-accent";

function UsageMeter({ label, meter }: { label: string; meter: Meter }) {
  const t = useTranslations("Shell.plan");
  if (meter.limit === null) {
    // Unlimited: there is no bar to fill, only what is in use.
    return (
      <div className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className="text-ink-2">{label}</span>
        <span className="font-medium tabular-nums">
          {meter.used} · {t("unlimited")}
        </span>
      </div>
    );
  }
  const limit = meter.limit;
  const percent = limit === 0 ? 0 : Math.min(100, (meter.used / limit) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className="text-ink-2">{label}</span>
        <span className="font-medium tabular-nums">
          {meter.used}/{limit}
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={meter.used}
        className="mt-1 h-1 overflow-hidden rounded-full bg-line"
      >
        <div
          className={`h-full rounded-full ${tone({ used: meter.used, limit })}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/**
 * The current plan and how much of it is used, at the foot of the sidebar (numbers come from
 * `PlanProvider`, which refreshes them on every navigation).
 */
export function PlanCard({ collapsed }: { collapsed: boolean }) {
  const t = useTranslations("Shell.plan");
  const plan = usePlan();

  if (collapsed) {
    return (
      <Link
        href="/dashboard/billing"
        title={t("upgrade")}
        className="flex min-h-10 items-center justify-center rounded-md bg-accent text-on-action hover:opacity-90"
      >
        <UpgradeIcon />
        <span className="sr-only">{t("upgrade")}</span>
      </Link>
    );
  }

  return (
    <section aria-label={t("label")} className="rounded-lg border border-line bg-page p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-medium tracking-[0.16em] text-ink-muted uppercase">
          {t("label")}
        </p>
        <p className="text-sm font-semibold">{t(`names.${plan?.plan ?? "starter"}`)}</p>
      </div>
      <div className="mt-2.5 min-h-[4.25rem] space-y-2">
        {plan && (
          <>
            <UsageMeter label={t("landingPages")} meter={plan.usage.landingPages} />
            <UsageMeter label={t("products")} meter={plan.usage.products} />
          </>
        )}
      </div>
      <Link
        href="/dashboard/billing"
        className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-semibold text-on-action hover:opacity-90"
      >
        <UpgradeIcon size={16} />
        {plan?.plan === "pro" ? t("manage") : t("upgrade")}
      </Link>
    </section>
  );
}
