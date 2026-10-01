"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { ClockIcon, TrendingUpIcon, WalletIcon } from "@/components/kai/icons";
import { Link } from "@/i18n/navigation";
import type { ReconRow } from "@/shared/admin/types";
import { Badge, Pager, PageHeader, StatCard, card, dateOnly, usePager } from "./ui";

type Tab = "all" | "pending" | "available";
const TABS: Tab[] = ["all", "pending", "available"];

/** Delivered orders and what is owed: total = product cost + delivery fee (Kandrop) + profit (merchant). */
export function ReconciliationView({ rows: all }: { rows: ReconRow[] }) {
  const t = useTranslations("Admin.recon");
  const f = useFormatters();
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>("all");

  const rows = all.filter((r) => tab === "all" || r.status === tab);
  const pager = usePager(rows, 10);
  const pending = all.filter((r) => r.status === "pending");
  const sum = (list: typeof all, pick: (r: (typeof all)[number]) => number) => list.reduce((s, r) => s + pick(r), 0);

  return (
    <div>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label={t("cards.pending")} value={f.money(sum(pending, (r) => r.merchantNet))} note={t("cards.pendingNote", { count: pending.length })} icon={<ClockIcon size={18} />} tone="warn" />
        <StatCard label={t("cards.available")} value={f.money(sum(all.filter((r) => r.status === "available"), (r) => r.merchantNet))} note={t("cards.availableNote")} icon={<WalletIcon size={18} />} />
        <StatCard label={t("cards.kandrop")} value={f.money(sum(all, (r) => r.productCost + r.commission))} note={t("cards.kandropNote")} icon={<TrendingUpIcon size={18} />} />
      </div>

      <div className={`${card} mt-6 overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ink-200)] p-4">
          <h2 className="text-[17px] font-bold tracking-tight text-[var(--ink-900)]">{t("table")}</h2>
          <div role="group" className="flex flex-wrap gap-1.5">
            {TABS.map((k) => (
              <button key={k} type="button" aria-pressed={tab === k} onClick={() => { setTab(k); pager.setPage(1); }}
                className={`rounded-full px-3.5 py-2 text-[13px] font-semibold ${tab === k ? "bg-[var(--ink-900)] text-white" : "text-[var(--ink-600)] hover:bg-[var(--ink-100)]"}`}>
                {t(`tabs.${k}`)} ({k === "all" ? all.length : all.filter((r) => r.status === k).length})
              </button>
            ))}
          </div>
        </div>
        {rows.length === 0 && <p className="px-6 py-14 text-center text-sm text-[var(--ink-600)]">{t("empty")}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[68rem] border-collapse text-sm">
            <thead className="border-b border-gray-100 bg-[var(--ink-50)]">
              <tr className="text-left text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase">
                <th className="px-4 py-3">{t("cols.order")}</th>
                <th className="px-4 py-3">{t("cols.merchant")}</th>
                <th className="px-4 py-3 text-right">{t("cols.total")}</th>
                <th className="px-2 py-3 text-center">=</th>
                <th className="px-4 py-3 text-right">{t("cols.cost")}</th>
                <th className="px-2 py-3 text-center">+</th>
                <th className="px-4 py-3 text-right">{t("cols.commission")}</th>
                <th className="px-2 py-3 text-center">+</th>
                <th className="px-4 py-3 text-right">{t("cols.profit")}</th>
                <th className="px-4 py-3">{t("cols.status")}</th>
              </tr>
            </thead>
            <tbody>
              {pager.slice.map((r) => {
                const balanced = r.total === r.productCost + r.commission + r.merchantNet;
                return (
                  <tr key={r.id} className="border-b border-gray-100 last:border-b-0 hover:bg-[var(--ink-50)]">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="mono-num font-bold">#{r.number}</p>
                      <p className="text-[12px] text-[var(--ink-500)]">{dateOnly(r.at, locale)}</p>
                    </td>
                    <td className="px-4 py-3"><Link href={`/admin/lojistas/${r.storeId}`} className="font-semibold text-[var(--ink-900)] hover:text-[var(--kai-orange-600)]">{r.store}</Link></td>
                    <td className="mono-num px-4 py-3 text-right font-extrabold text-[var(--ink-900)]">{f.money(r.total)}</td>
                    <td className="px-2 text-center text-[var(--ink-300)]" title={balanced ? t("balanced") : t("unbalanced")}>{balanced ? "=" : "≠"}</td>
                    <td className="mono-num px-4 py-3 text-right text-[var(--ink-700)]">{f.money(r.productCost)}</td>
                    <td className="px-2 text-center text-[var(--ink-300)]">+</td>
                    <td className="mono-num px-4 py-3 text-right text-[var(--kai-orange-600)]">{f.money(r.commission)}</td>
                    <td className="px-2 text-center text-[var(--ink-300)]">+</td>
                    <td className="mono-num px-4 py-3 text-right font-bold text-[var(--kai-success)]">{f.money(r.merchantNet)}</td>
                    <td className="px-4 py-3"><Badge tone={r.status === "available" ? "success" : "warn"}>{t(`status.${r.status}`)}</Badge></td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pager pager={pager} />
      </div>
      <p className="mt-4 text-center text-[12px] text-[var(--ink-500)]">{t("autoRelease")}</p>
    </div>
  );
}
