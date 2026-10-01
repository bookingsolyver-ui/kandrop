"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { BoxIcon, ClockIcon, TrendingUpIcon, WalletIcon } from "@/components/kai/icons";
import {
  ADMIN_ORDERS,
  LEDGER,
  MERCHANTS,
  cashFlowTotals,
  dailySeries,
  merchantById,
  type LedgerEntry,
  type LedgerKind,
} from "@/shared/admin/mock";
import { Badge, Pager, PageHeader, StatCard, card, dateTime, fold, usePager } from "./ui";

const KIND_TONE: Record<LedgerKind, "success" | "brand" | "neutral" | "warn" | "danger"> = {
  payment_in: "success",
  fee_retained: "brand",
  supplier_payment: "neutral",
  payout_request: "warn",
  payout_paid: "neutral",
  refund: "danger",
  adjustment: "brand",
};

/** Two bars per day: GMV (grey) and Kandrop's own revenue (orange). */
function DailyChart({ label }: { label: string }) {
  const series = useMemo(() => dailySeries(), []);
  const f = useFormatters();
  const max = Math.max(1, ...series.map((d) => d.gmv));
  const W = 700;
  const H = 220;
  const slot = W / series.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} role="img" aria-label={label} className="h-64 w-full">
      {[0.25, 0.5, 0.75, 1].map((p) => (
        <line key={p} x1="0" x2={W} y1={H - H * p} y2={H - H * p} stroke="#e6e6e6" strokeDasharray="3 4" />
      ))}
      {series.map((d, i) => {
        const x = i * slot + slot * 0.18;
        const bar = slot * 0.3;
        const h1 = (d.gmv / max) * H;
        const h2 = (d.revenue / max) * H;
        return (
          <g key={d.date}>
            <title>{`${d.date}: ${f.money(d.gmv)} / ${f.money(d.revenue)}`}</title>
            <rect x={x} y={H - h1} width={bar} height={h1} rx="3" fill="#cfcfce" />
            <rect x={x + bar + 3} y={H - h2} width={bar} height={h2} rx="3" fill="#ff5a00" />
            <text x={x + bar} y={H + 16} textAnchor="middle" fontSize="10" fill="#767676">
              {d.date.slice(8)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** The platform's cash flow: four headline numbers, a 14-day chart and the full statement. */
export function CashFlowView() {
  const t = useTranslations("Admin.cash");
  const f = useFormatters();
  const locale = useLocale();
  const totals = useMemo(() => cashFlowTotals(), []);

  const [live, setLive] = useState(false);
  const [extra, setExtra] = useState<LedgerEntry[]>([]);
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState<"all" | "in" | "out">("all");

  // "Live": while on, a new simulated payment lands in the statement every few seconds.
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => {
      setExtra((list) => {
        const order = ADMIN_ORDERS[(list.length * 7 + 3) % ADMIN_ORDERS.length]!;
        const entry: LedgerEntry = {
          id: `live_${Date.now()}`,
          at: Date.now(),
          kind: list.length % 3 === 2 ? "payout_request" : "payment_in",
          amount: list.length % 3 === 2 ? -Math.round(order.merchantMargin * 1.5) : order.total,
          merchantId: order.merchantId,
          reference: `#${order.number + 900 + list.length}`,
          note: order.product,
        };
        return [entry, ...list].slice(0, 25);
      });
    }, 6000);
    return () => clearInterval(timer);
  }, [live]);

  const rows = useMemo(() => {
    const q = fold(query.trim());
    return [...extra, ...LEDGER].filter((e) => {
      if (direction === "in" && e.amount <= 0) return false;
      if (direction === "out" && e.amount >= 0) return false;
      if (!q) return true;
      const merchant = merchantById(e.merchantId);
      return fold(`${merchant?.store ?? ""} ${e.reference} ${e.note ?? ""} ${t(`kind.${e.kind}`)}`).includes(q);
    });
  }, [extra, query, direction, t]);
  const pager = usePager(rows, 10);

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard label={t("cards.gmv")} value={f.money(totals.gmv)} note={t("cards.gmvNote")} icon={<TrendingUpIcon size={18} />} />
        <StatCard label={t("cards.revenue")} value={f.money(totals.revenue)} note={t("cards.revenueNote")} icon={<WalletIcon size={18} />} />
        <StatCard label={t("cards.held")} value={f.money(totals.held)} note={t("cards.heldNote", { count: MERCHANTS.length })} icon={<BoxIcon size={18} />} tone="warn" />
        <StatCard label={t("cards.transit")} value={f.money(totals.inTransit)} note={t("cards.transitNote")} icon={<ClockIcon size={18} />} />
      </div>

      <section className={`${card} mt-6 p-5`} aria-labelledby="chart-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="chart-title" className="text-[17px] font-bold tracking-tight text-[var(--ink-900)]">{t("chart.title")}</h2>
          <div className="flex gap-4 text-xs text-[var(--ink-600)]">
            <span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#cfcfce]" />{t("chart.gmv")}</span>
            <span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-brand-orange" />{t("chart.revenue")}</span>
          </div>
        </div>
        <DailyChart label={t("chart.label")} />
      </section>

      <section className={`${card} mt-6 overflow-hidden`} aria-labelledby="ledger-title">
        <div className="flex flex-col gap-3 border-b border-[var(--ink-200)] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <h2 id="ledger-title" className="text-[17px] font-bold tracking-tight text-[var(--ink-900)]">{t("ledger.title")}</h2>
            <button
              type="button"
              onClick={() => setLive((v) => !v)}
              aria-pressed={live}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-bold ${live ? "border-[var(--kai-success)] bg-[var(--kai-success-bg)] text-[var(--kai-success)]" : "border-[var(--ink-200)] bg-white text-[var(--ink-600)]"}`}
            >
              <span className={`size-2 rounded-full ${live ? "animate-pulse bg-[var(--kai-success)]" : "bg-[var(--ink-300)]"}`} />
              {t("ledger.live")}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => { setQuery(e.target.value); pager.setPage(1); }}
              placeholder={t("ledger.search")}
              aria-label={t("ledger.search")}
              className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20 sm:w-64"
            />
            <div role="group" className="flex gap-1">
              {(["all", "in", "out"] as const).map((d) => (
                <button key={d} type="button" aria-pressed={direction === d} onClick={() => { setDirection(d); pager.setPage(1); }}
                  className={`rounded-full px-3.5 py-2 text-[13px] font-semibold ${direction === d ? "bg-[var(--ink-900)] text-white" : "text-[var(--ink-600)] hover:bg-[var(--ink-100)]"}`}>
                  {t(`ledger.filter.${d}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <thead className="border-b border-gray-100 bg-[var(--ink-50)]">
              <tr className="text-left text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase">
                <th className="px-4 py-3">{t("ledger.cols.time")}</th>
                <th className="px-4 py-3">{t("ledger.cols.type")}</th>
                <th className="px-4 py-3">{t("ledger.cols.merchant")}</th>
                <th className="px-4 py-3">{t("ledger.cols.ref")}</th>
                <th className="px-4 py-3 text-right">{t("ledger.cols.amount")}</th>
              </tr>
            </thead>
            <tbody>
              {pager.slice.map((e) => (
                <tr key={e.id} className="border-b border-gray-100 last:border-b-0 hover:bg-[var(--ink-50)]">
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--ink-600)]">{dateTime(e.at, locale)}</td>
                  <td className="px-4 py-3"><Badge tone={KIND_TONE[e.kind]}>{t(`kind.${e.kind}`)}</Badge></td>
                  <td className="px-4 py-3 font-medium text-[var(--ink-900)]">{merchantById(e.merchantId)?.store}</td>
                  <td className="px-4 py-3 text-[var(--ink-600)]">
                    <span className="mono-num">{e.reference}</span>
                    {e.note && <span className="ml-2 text-[12px] text-[var(--ink-500)]">{e.note === "paid" || e.note === "pending" || e.note === "rejected" ? t(`status.${e.note}`) : e.note}</span>}
                  </td>
                  <td className={`mono-num px-4 py-3 text-right font-bold ${e.amount > 0 ? "text-[var(--kai-success)]" : e.amount < 0 ? "text-[var(--ink-900)]" : "text-[var(--ink-500)]"}`}>
                    {e.amount > 0 ? "+" : ""}{f.money(e.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager pager={pager} />
      </section>
    </div>
  );
}

