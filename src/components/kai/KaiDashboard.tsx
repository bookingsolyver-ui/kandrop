"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";
import { useDashboardLive } from "@/components/dashboard/useDashboardLive";
import { useFormatters } from "@/components/dashboard/useFormatters";
import type { DashboardSummary } from "@/server/modules/dashboard/schema";
import { KaiBanner } from "./KaiBanner";
import { KaiGauge } from "./KaiGauge";
import { KaiSalesChart } from "./KaiSalesChart";
import {
  BagIcon,
  BankIcon,
  CardIcon,
  ClockIcon,
  PhoneIcon,
  ReceiptIcon,
  TrendingUpIcon,
  WalletIcon,
  CartIcon,
} from "./icons";

type Period = "yesterday" | "today" | "month" | "last30" | "lastMonth";
const PERIODS: Period[] = ["yesterday", "today", "month", "last30", "lastMonth"];

type Point = DashboardSummary["revenueSeries"][number];

/** The days of `series` that belong to the period (the series is sorted, its last day is "today"). */
function select(series: Point[], period: Period): Point[] {
  const last = series[series.length - 1];
  if (!last) return [];
  const month = last.date.slice(0, 7);
  const prev = new Date(`${month}-01T00:00:00Z`);
  prev.setUTCMonth(prev.getUTCMonth() - 1);
  const prevMonth = prev.toISOString().slice(0, 7);
  if (period === "today") return [last];
  if (period === "yesterday") return series.length > 1 ? [series[series.length - 2]!] : [];
  if (period === "month") return series.filter((p) => p.date.startsWith(month));
  if (period === "lastMonth") return series.filter((p) => p.date.startsWith(prevMonth));
  return series;
}

const sum = (xs: Point[], key: "gross" | "net") => xs.reduce((a, p) => a + p[key], 0);
const pct = (now: number, before: number) => (before === 0 ? 0 : (now / before - 1) * 100);

const card =
  "rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-0)] p-6 shadow-[var(--sh-xs)]";

function StatCard({
  icon,
  title,
  value,
  delta,
  caption,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  delta: number;
  caption: string;
}) {
  const negative = delta < 0;
  return (
    <div className="relative min-w-0 overflow-hidden rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-0)] p-[22px] shadow-[var(--sh-xs)] transition-all hover:-translate-y-px hover:shadow-[var(--sh-md)]">
      <div className="mb-[14px] flex min-w-0 items-center gap-2.5 text-[14px] font-medium text-[var(--ink-600)]">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--kai-orange-50)] text-[var(--kai-orange-600)]">
          {icon}
        </span>
        <span className="min-w-0 truncate">{title}</span>
      </div>
      <div className="mono-num mb-[6px] min-w-0 text-[24px] leading-tight font-extrabold tracking-[-0.03em] break-words text-[var(--ink-900)]">
        {value}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-[var(--r-pill)] px-2.5 py-1 text-[12px] font-semibold ${
            negative
              ? "bg-[var(--kai-danger-bg)] text-[var(--kai-danger)]"
              : "bg-[var(--kai-success-bg)] text-[var(--kai-success)]"
          }`}
        >
          {negative ? "↓" : "↑"} {Math.abs(delta).toFixed(1).replace(/\.0$/, "")}%
        </span>
        <span className="text-[12px] text-[var(--ink-500)]">{caption}</span>
      </div>
    </div>
  );
}

const METHOD_STYLE = {
  multicaixa_express: { color: "rgb(0, 181, 160)", Icon: PhoneIcon },
  unitel_money: { color: "rgb(255, 90, 0)", Icon: WalletIcon },
  card: { color: "rgb(212, 182, 0)", Icon: CardIcon },
  bank_transfer: { color: "rgb(122, 122, 31)", Icon: BankIcon },
} as const;

/** The dashboard page body: period tabs, sales chart, order status, stat cards and payment methods. */
export function KaiDashboard() {
  const t = useTranslations("Kai");
  const methods = useTranslations("Checkout.method");
  const locale = useLocale();
  const f = useFormatters();
  const { summary } = useDashboardLive();
  const [period, setPeriod] = useState<Period>("today");

  const view = useMemo(() => {
    if (!summary) return null;
    const series = summary.revenueSeries;
    const days = select(series, period);
    const gross = sum(days, "gross");
    const net = sum(days, "net");
    const totalGross = sum(series, "gross");
    const share = totalGross === 0 ? 0 : gross / totalGross;
    const { extras } = summary;

    // Change against the day before for the one-day periods; against the previous window otherwise.
    const at = (i: number, key: "gross" | "net") => series[series.length - 1 - i]?.[key] ?? 0;
    const change = (key: "gross" | "net", fallback: number) =>
      period === "today"
        ? pct(at(0, key), at(1, key))
        : period === "yesterday"
          ? pct(at(1, key), at(2, key))
          : fallback;
    const scaled = (n: number) => Math.round(n * share);
    const orders = extras.avgTicket > 0 ? Math.round(gross / extras.avgTicket) : 0;
    const status = {
      preparing: scaled(extras.orderStatus.preparing),
      shipped: scaled(extras.orderStatus.shipped),
      delivered: scaled(extras.orderStatus.delivered),
      returned: scaled(extras.orderStatus.returned),
    };
    return {
      days,
      gross,
      net,
      orders,
      status,
      statusTotal: status.preparing + status.shipped + status.delivered + status.returned,
      grossChange: change("gross", summary.grossRevenue.changePct),
      netChange: change("net", summary.netRevenue.changePct),
      abandoned: scaled(extras.abandonedCarts),
      refunded: scaled(extras.refunded),
      chargebacks: scaled(extras.chargebacks),
      chart: (days.length >= 2 ? days : series.slice(-7)).map((p) => ({
        date: p.date,
        gross: p.gross,
      })),
    };
  }, [summary, period]);

  const caption =
    period === "today"
      ? t("vs.yesterday")
      : period === "yesterday"
        ? t("vs.dayBefore")
        : t("vs.previous");
  const formatDay = (iso: string) =>
    new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", timeZone: "UTC" }).format(
      new Date(`${iso}T00:00:00Z`)
    );

  const statusRows = [
    { key: "preparing", color: "rgb(255, 90, 0)" },
    { key: "shipped", color: "rgb(59, 130, 246)" },
    { key: "delivered", color: "rgb(22, 163, 74)" },
    { key: "returned", color: "rgb(220, 38, 38)" },
  ] as const;

  const zero = summary === null || view === null;
  const money = (minor: number) => f.money(minor);

  return (
    <div className="min-h-full space-y-6">
      <KaiBanner />

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[32px] font-extrabold tracking-[-0.025em] text-[var(--ink-900)]">
            {t("title")}
          </h1>
          <p className="mt-1.5 text-[16px] text-[var(--ink-600)]">{t("subtitle")}</p>
        </div>
        {summary && (
          <p className="text-[13px] text-[var(--ink-500)] tabular-nums">
            {t("updatedAt", { time: f.time(summary.updatedAt) })}
          </p>
        )}
      </div>

      <div
        role="tablist"
        aria-label={t("periodLabel")}
        className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-[var(--r-pill)] border border-[var(--ink-200)] bg-[var(--ink-0)] p-1.5 shadow-[var(--sh-xs)]"
      >
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={period === p}
            onClick={() => setPeriod(p)}
            className={`rounded-[var(--r-pill)] px-5 py-2 text-[14px] font-semibold whitespace-nowrap transition-all ${
              period === p
                ? "bg-[var(--ink-900)] text-white shadow-[var(--sh-sm)]"
                : "text-[var(--ink-600)] hover:text-[var(--ink-900)]"
            }`}
          >
            {t(`periods.${p}`)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col">
          <div className={`${card} flex flex-1 flex-col`}>
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="mb-1 text-[13px] text-[var(--ink-600)]">{t("balance")}</p>
                <span className="mono-num text-[26px] font-extrabold tracking-[-0.025em] text-[var(--ink-900)]">
                  {money(summary?.availableBalance.value.amount ?? 0)}
                </span>
              </div>
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "rgb(255, 90, 0)" }} />
                  <span className="text-[var(--ink-600)]">{t("sold")}</span>
                </div>
              </div>
            </div>
            {zero ? (
              <div className="h-96" />
            ) : (
              <KaiSalesChart
                points={view.chart}
                label={t("chartLabel")}
                formatMoney={money}
                formatDay={formatDay}
              />
            )}
          </div>
        </div>

        <div className="flex flex-col">
          <div className={`${card} flex h-full flex-col`}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[17px] font-bold tracking-[-0.01em] text-[var(--ink-900)]">
                {t("orderStatus.title")}
              </h3>
            </div>
            <div className="flex flex-1 flex-col items-center gap-4 sm:flex-row sm:gap-6">
              {/* The gauge is a 180 px square whose lower part (the gap of the arc) is empty, so the
                  box is cropped to 156 px; the text is centred on the square, i.e. on the hole. */}
              <div className="relative h-[156px] w-[180px] shrink-0">
                <div className="absolute top-0 left-0 size-[180px]">
                  <KaiGauge
                    segments={statusRows.map((r) => ({
                      key: r.key,
                      color: r.color,
                      value: view?.status[r.key] ?? 0,
                    }))}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="mono-num text-[34px] leading-none font-extrabold tracking-[-0.03em] text-[var(--ink-900)]">
                      {view?.statusTotal ?? 0}
                    </span>
                    <span className="mt-1.5 max-w-[92px] text-center text-[10px] leading-tight text-[var(--ink-600)]">
                      {t("orderStatus.caption")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-1 flex-col gap-2 sm:w-auto">
                {statusRows.map((r) => (
                  <div key={r.key} className="flex items-center justify-between gap-3 text-[13px]">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span
                        aria-hidden
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 2,
                          background: r.color,
                          display: "inline-block",
                          flexShrink: 0,
                        }}
                      />
                      <span className="truncate text-[var(--ink-700)]">
                        {t(`orderStatus.${r.key}`)}
                      </span>
                    </div>
                    <span className="mono-num shrink-0 font-semibold text-[var(--ink-900)]">
                      {view?.status[r.key] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          icon={<CartIcon size={16} />}
          title={t("cards.sales")}
          value={String(view?.orders ?? 0)}
          delta={view?.grossChange ?? 0}
          caption={caption}
        />
        <StatCard
          icon={<TrendingUpIcon size={16} />}
          title={t("cards.billed")}
          value={money(view?.gross ?? 0)}
          delta={view?.grossChange ?? 0}
          caption={caption}
        />
        <StatCard
          icon={<WalletIcon size={16} />}
          title={t("cards.net")}
          value={money(view?.net ?? 0)}
          delta={view?.netChange ?? 0}
          caption={caption}
        />
        <StatCard
          icon={<ReceiptIcon size={16} />}
          title={t("cards.avgTicket")}
          value={money(summary?.extras.avgTicket ?? 0)}
          delta={view?.grossChange ?? 0}
          caption={caption}
        />
        <StatCard
          icon={<ClockIcon size={16} />}
          title={t("cards.pending")}
          value={String(summary?.pendingOrders.count ?? 0)}
          delta={0}
          caption={caption}
        />
        <StatCard
          icon={<BagIcon size={16} />}
          title={t("cards.abandoned")}
          value={String(view?.abandoned ?? 0)}
          delta={0}
          caption={caption}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className={card}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[17px] font-bold tracking-[-0.01em] text-[var(--ink-900)]">
              {t("refunds.title")}
            </h3>
            <span
              className={`inline-flex h-6 items-center rounded-[var(--r-pill)] px-2.5 text-[12px] font-semibold ${
                (view?.refunded ?? 0) > 0
                  ? "bg-[var(--kai-warn-bg)] text-[var(--kai-warn)]"
                  : "bg-[var(--kai-success-bg)] text-[var(--kai-success)]"
              }`}
            >
              {(view?.refunded ?? 0) > 0 ? t("badge.attention") : t("badge.healthy")}
            </span>
          </div>
          <p className="mb-1 text-[13px] text-[var(--ink-600)]">{t("refunds.total")}</p>
          <div className="mono-num text-[26px] font-extrabold tracking-[-0.025em] text-[var(--ink-900)]">
            {money(view?.refunded ?? 0)}
          </div>
        </div>
        <div className={card}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[17px] font-bold tracking-[-0.01em] text-[var(--ink-900)]">
              {t("chargebacks.title")}
            </h3>
            <span
              className={`inline-flex h-6 items-center rounded-[var(--r-pill)] px-2.5 text-[12px] font-semibold ${
                (view?.chargebacks ?? 0) > 0
                  ? "bg-[var(--kai-warn-bg)] text-[var(--kai-warn)]"
                  : "bg-[var(--kai-success-bg)] text-[var(--kai-success)]"
              }`}
            >
              {(view?.chargebacks ?? 0) > 0 ? t("badge.attention") : t("badge.healthy")}
            </span>
          </div>
          <p className="mb-1 text-[13px] text-[var(--ink-600)]">{t("chargebacks.total")}</p>
          <div className="mono-num text-[26px] font-extrabold tracking-[-0.025em] text-[var(--ink-900)]">
            {money(view?.chargebacks ?? 0)}
          </div>
        </div>
      </div>

      <div className={card}>
        <h3 className="mb-5 text-[17px] font-bold tracking-[-0.01em] text-[var(--ink-900)]">
          {t("methods.title")}
        </h3>
        <div className="flex flex-col gap-4">
          {(summary?.extras.paymentMethods ?? []).map((m) => {
            const { color, Icon } = METHOD_STYLE[m.method];
            const share = summary && view ? sumShare(summary, view.gross) : 0;
            return (
              <div key={m.method} className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
                  style={{ background: color.replace("rgb(", "rgba(").replace(")", ", 0.15)"), color }}
                >
                  <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-[var(--ink-900)]">
                    {methods(`${m.method}.name`)}
                  </div>
                  <div className="text-[12px] text-[var(--ink-500)]">
                    {t("methods.conversion", { rate: m.conversion.toFixed(1) })}
                  </div>
                </div>
                <div className="flex shrink-0 items-baseline gap-1.5 text-[14px] font-semibold text-[var(--ink-900)]">
                  <span className="mono-num inline-block w-9 text-right">
                    {Math.round(m.sales * share)}
                  </span>
                  <span className="inline-block w-14 text-left text-[var(--ink-600)]">
                    {t("methods.sales")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Share of the whole window that the selected period represents (scales the per-method sales). */
function sumShare(summary: DashboardSummary, periodGross: number) {
  const total = summary.revenueSeries.reduce((a, p) => a + p.gross, 0);
  return total === 0 ? 0 : periodGross / total;
}
