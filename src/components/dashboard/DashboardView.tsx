"use client";

import { useTranslations } from "next-intl";
import { Delta } from "./Delta";
import { KpiCell, KpiSkeleton, KpiStrip } from "./KpiCard";
import { Money } from "./Money";
import { RevenueChart } from "./RevenueChart";
import { TopProductsTable } from "./TopProductsTable";
import { useDashboardLive } from "./useDashboardLive";
import { useFormatters } from "./useFormatters";

export function DashboardView() {
  const t = useTranslations("Dashboard");
  const f = useFormatters();
  const { summary, isLive } = useDashboardLive();

  const change = (pct: number) => (
    <p>
      {t.rich("kpi.vsPrevious", {
        value: f.signedPercent(pct),
        change: (chunks) => <Delta pct={pct}>{chunks}</Delta>,
      })}
    </p>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="text-[11px] font-medium tracking-[0.14em] text-ink-muted uppercase">
          {t("period", { days: summary?.periodDays ?? 14 })}
        </p>
        {summary && (
          <p className="text-[13px] text-ink-muted tabular-nums">
            {t("updatedAt", { time: f.time(summary.updatedAt) })}
          </p>
        )}
      </div>

      {summary ? (
        <KpiStrip>
          <KpiCell
            index={0}
            label={t("kpi.grossRevenue.label")}
            value={<Money minor={summary.grossRevenue.value.amount} />}
            valueKey={String(summary.grossRevenue.value.amount)}
            hint={change(summary.grossRevenue.changePct)}
            live={isLive}
          />
          <KpiCell
            index={1}
            label={t("kpi.netRevenue.label")}
            value={<Money minor={summary.netRevenue.value.amount} />}
            valueKey={String(summary.netRevenue.value.amount)}
            hint={
              <>
                <p>
                  {t("kpi.netRevenue.hint", { rate: f.percent(summary.netRevenue.marginRate) })}
                </p>
                {change(summary.netRevenue.changePct)}
              </>
            }
            live={isLive}
          />
          <KpiCell
            index={2}
            label={t("kpi.pendingOrders.label")}
            value={f.integer(summary.pendingOrders.count)}
            valueKey={String(summary.pendingOrders.count)}
            hint={
              <p>
                {t("kpi.pendingOrders.hint", {
                  value: f.money(summary.pendingOrders.value.amount),
                })}
              </p>
            }
            live={isLive}
          />
          <KpiCell
            index={3}
            emphasis
            label={t("kpi.availableBalance.label")}
            value={<Money minor={summary.availableBalance.value.amount} />}
            valueKey={String(summary.availableBalance.value.amount)}
            hint={
              <p>
                {t("kpi.availableBalance.hint", {
                  amount: f.money(summary.availableBalance.releasing.amount),
                })}
              </p>
            }
            live={isLive}
          />
        </KpiStrip>
      ) : (
        <KpiSkeleton />
      )}

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RevenueChart series={summary?.revenueSeries ?? []} />
        </div>
        <div className="lg:col-span-2">
          <TopProductsTable products={summary?.topProducts ?? []} live={isLive} />
        </div>
      </div>
    </div>
  );
}
