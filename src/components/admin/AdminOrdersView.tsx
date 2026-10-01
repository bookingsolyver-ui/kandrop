"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { Link } from "@/i18n/navigation";
import { ADMIN_ORDERS, merchantById, type OrderState } from "@/shared/admin/mock";
import { Badge, Pager, PageHeader, card, dateTime, fold, usePager } from "./ui";

type Filter = "all" | "delayed" | "refunds" | "transit";
const FILTERS: Filter[] = ["all", "delayed", "refunds", "transit"];
const TONE: Record<OrderState, "warn" | "brand" | "success" | "danger" | "neutral"> = { pending: "warn", processing: "warn", shipped: "brand", delivered: "success", returned: "danger", cancelled: "neutral" };

const test: Record<Filter, (o: (typeof ADMIN_ORDERS)[number]) => boolean> = {
  all: () => true,
  delayed: (o) => o.delayed,
  refunds: (o) => o.refundPending,
  transit: (o) => o.state === "shipped",
};

/** All orders with the money flow of each one: cost + margin + delivery = what the customer paid. */
export function AdminOrdersView() {
  const t = useTranslations("Admin.orders");
  const f = useFormatters();
  const locale = useLocale();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = fold(query.trim());
    return ADMIN_ORDERS.filter(test[filter]).filter((o) => !q || fold(`${o.number} ${o.product} ${merchantById(o.merchantId)?.store ?? ""} ${o.courier}`).includes(q)).sort((a, b) => b.createdAt - a.createdAt);
  }, [filter, query]);
  const pager = usePager(rows, 10);

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className={`${card} overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-[var(--ink-200)] p-4 lg:flex-row lg:items-center lg:justify-between">
          <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); pager.setPage(1); }} placeholder={t("search")} aria-label={t("search")}
            className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20 lg:w-96" />
          <div role="group" className="flex flex-wrap gap-1.5">
            {FILTERS.map((k) => (
              <button key={k} type="button" aria-pressed={filter === k} onClick={() => { setFilter(k); pager.setPage(1); }}
                className={`rounded-full px-3.5 py-2 text-[13px] font-semibold ${filter === k ? "bg-[var(--ink-900)] text-white" : "text-[var(--ink-600)] hover:bg-[var(--ink-100)]"}`}>
                {t(`filters.${k}`)} ({ADMIN_ORDERS.filter(test[k]).length})
              </button>
            ))}
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-[var(--ink-600)]">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[64rem] border-collapse text-sm">
              <thead className="border-b border-gray-100 bg-[var(--ink-50)]">
                <tr className="text-left text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase">
                  <th className="px-4 py-3">{t("cols.order")}</th>
                  <th className="px-4 py-3">{t("cols.product")}</th>
                  <th className="px-4 py-3">{t("cols.flow")}</th>
                  <th className="px-4 py-3">{t("cols.status")}</th>
                </tr>
              </thead>
              <tbody>
                {pager.slice.map((o) => (
                  <tr key={o.id} className="border-b border-gray-100 align-top last:border-b-0 hover:bg-[var(--ink-50)]">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="mono-num font-bold text-[var(--ink-900)]">#{o.number}</p>
                      <p className="text-[12px] text-[var(--ink-500)]">{dateTime(o.createdAt, locale)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="line-clamp-2 max-w-xs font-semibold text-[var(--ink-900)]">{o.product}{o.quantity > 1 ? ` ×${o.quantity}` : ""}</p>
                      <Link href={`/admin/lojistas/${o.merchantId}`} className="text-[12px] text-[var(--ink-500)] hover:text-[var(--kai-orange-600)]">{merchantById(o.merchantId)?.store}</Link>
                      <p className="text-[12px] text-[var(--ink-500)]">{o.city} · {o.courier}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="mono-num flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[13px]">
                        <span title={t("flow.cost")}>{f.money(o.productCost)}</span><span className="text-[var(--ink-300)]">+</span>
                        <span title={t("flow.margin")} className="text-[var(--kai-success)]">{f.money(o.merchantMargin)}</span><span className="text-[var(--ink-300)]">+</span>
                        <span title={t("flow.delivery")} className="text-[var(--kai-orange-600)]">{f.money(o.deliveryFee)}</span><span className="text-[var(--ink-300)]">=</span>
                        <strong className="text-[var(--ink-900)]">{f.money(o.total)}</strong>
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--ink-500)]">{t("flow.legend")} · {t("flow.fee", { amount: f.money(o.platformFee) })}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1.5">
                        <Badge tone={TONE[o.state]}>{t(`state.${o.state}`)}</Badge>
                        {o.delayed && <Badge tone="danger">{t("delayed")}</Badge>}
                        {o.refundPending && <Badge tone="warn">{t("refundPending")}</Badge>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager pager={pager} />
      </div>
    </div>
  );
}
