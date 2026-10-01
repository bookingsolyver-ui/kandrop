"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { BoxIcon, ClockIcon, WalletIcon } from "@/components/kai/icons";
import type { CatalogRow } from "@/shared/admin/types";
import { Badge, Pager, PageHeader, StatCard, card, fold, usePager } from "./ui";

type Tab = "all" | "out" | "critical" | "healthy";
const TABS: Tab[] = ["all", "out", "critical", "healthy"];
/** Fewer units than this is critical stock. */
const CRITICAL_STOCK = 10;
const levelOf = (i: CatalogRow): "out" | "critical" | "healthy" => (i.stock === 0 ? "out" : i.stock < CRITICAL_STOCK ? "critical" : "healthy");

/** Stock health only: what is out, what is about to be, and how much money sits on the shelves. */
export function InventoryView({ rows: INVENTORY }: { rows: CatalogRow[] }) {
  const t = useTranslations("Admin.inventory");
  const f = useFormatters();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");

  const out = INVENTORY.filter((i) => i.stock === 0);
  const critical = INVENTORY.filter((i) => levelOf(i) === "critical");
  const capital = INVENTORY.reduce((sum, i) => sum + i.stock * i.costPrice, 0);

  const rows = useMemo(() => {
    const q = fold(query.trim());
    return INVENTORY.filter((i) => (tab === "all" || levelOf(i) === tab) && (!q || fold(`${i.name} ${i.category} ${i.supplierName}`).includes(q))).sort((a, b) => a.stock - b.stock);
  }, [INVENTORY, tab, query]);
  const pager = usePager(rows, 10);
  const count = (k: Tab) => (k === "all" ? INVENTORY.length : INVENTORY.filter((i) => levelOf(i) === k).length);

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label={t("cards.out")} value={String(out.length)} note={t("cards.outNote")} icon={<BoxIcon size={18} />} tone="danger" />
        <StatCard label={t("cards.critical", { limit: CRITICAL_STOCK })} value={String(critical.length)} note={t("cards.criticalNote")} icon={<ClockIcon size={18} />} tone="warn" />
        <StatCard label={t("cards.capital")} value={f.money(capital)} note={t("cards.capitalNote")} icon={<WalletIcon size={18} />} />
      </div>

      <div className={`${card} mt-6 overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-[var(--ink-200)] p-4 lg:flex-row lg:items-center lg:justify-between">
          <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); pager.setPage(1); }} placeholder={t("search")} aria-label={t("search")}
            className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20 lg:w-96" />
          <div role="group" className="flex flex-wrap gap-1.5">
            {TABS.map((k) => (
              <button key={k} type="button" aria-pressed={tab === k} onClick={() => { setTab(k); pager.setPage(1); }}
                className={`rounded-full px-3.5 py-2 text-[13px] font-semibold ${tab === k ? "bg-[var(--ink-900)] text-white" : "text-[var(--ink-600)] hover:bg-[var(--ink-100)]"}`}>
                {t(`tabs.${k}`)} ({count(k)})
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] border-collapse text-sm">
            <thead className="border-b border-gray-100 bg-[var(--ink-50)]">
              <tr className="text-left text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase">
                <th className="px-4 py-3">{t("cols.product")}</th>
                <th className="px-4 py-3">{t("cols.category")}</th>
                <th className="px-4 py-3 text-right">{t("cols.quantity")}</th>
                <th className="px-4 py-3 text-right">{t("cols.weekly")}</th>
                <th className="px-4 py-3">{t("cols.status")}</th>
              </tr>
            </thead>
            <tbody>
              {pager.slice.map((i) => {
                const level = levelOf(i);
                const weeks = i.weeklySales > 0 ? i.stock / i.weeklySales : 0;
                return (
                  <tr key={i.id} className="border-b border-gray-100 last:border-b-0 hover:bg-[var(--ink-50)]">
                    <td className="px-4 py-3">
                      <p className="line-clamp-1 max-w-md font-semibold text-[var(--ink-900)]">{i.name}</p>
                      <p className="text-[12px] text-[var(--ink-500)]">{i.supplierName} · {t("stores", { count: i.stores })}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--ink-600)]">{i.category}</td>
                    <td className={`mono-num px-4 py-3 text-right font-extrabold ${level === "out" ? "text-[var(--kai-danger)]" : level === "critical" ? "text-[var(--kai-warn)]" : "text-[var(--ink-900)]"}`}>{i.stock}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="mono-num font-semibold">{i.weeklySales}</span>
                      <span className="block text-[11px] text-[var(--ink-500)]">{level === "out" ? "—" : t("coverage", { weeks: weeks.toFixed(1) })}</span>
                    </td>
                    <td className="px-4 py-3">
                      {level === "out" ? (
                        <Badge tone="danger" className="animate-pulse font-bold uppercase"><span aria-hidden className="size-1.5 rounded-full bg-[var(--kai-danger)]" />{t("badge.out")}</Badge>
                      ) : level === "critical" ? (
                        <Badge tone="warn">{t("badge.critical")}</Badge>
                      ) : (
                        <Badge tone="success">{t("badge.ok")}</Badge>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="px-6 py-14 text-center text-sm text-[var(--ink-600)]">{t("empty")}</p>}
        <Pager pager={pager} />
      </div>

    </div>
  );
}
