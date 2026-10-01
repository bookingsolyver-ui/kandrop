"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { ClockIcon, TrendingUpIcon, WalletIcon } from "@/components/kai/icons";
import { useToast } from "@/components/ui/Toast";
import { Link } from "@/i18n/navigation";
import { RECON_ROWS, merchantById } from "@/shared/admin/mock";
import { Badge, Pager, PageHeader, StatCard, card, dateOnly, usePager } from "./ui";

type Tab = "all" | "pending" | "available";
const TABS: Tab[] = ["all", "pending", "available"];

/** Delivered orders and what is owed: total = product cost + delivery fee (Kandrop) + profit (merchant). */
export function ReconciliationView() {
  const t = useTranslations("Admin.recon");
  const f = useFormatters();
  const locale = useLocale();
  const toast = useToast();
  const [released, setReleased] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>("all");

  const all = useMemo(() => RECON_ROWS.map((r) => ({ ...r, status: released.has(r.orderId) ? ("available" as const) : r.status })), [released]);
  const rows = all.filter((r) => tab === "all" || r.status === tab);
  const pager = usePager(rows, 10);
  const pending = all.filter((r) => r.status === "pending");
  const sum = (list: typeof all, pick: (r: (typeof all)[number]) => number) => list.reduce((s, r) => s + pick(r), 0);

  const release = (ids: string[]) => {
    setReleased((s) => new Set([...s, ...ids]));
    toast({ message: t("toast.released", { count: ids.length }) });
  };

  return (
    <div>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <button type="button" disabled={pending.length === 0} onClick={() => release(pending.map((r) => r.orderId))}
            className="inline-flex h-10 items-center rounded-full bg-brand-orange px-5 text-sm font-bold text-brand-black disabled:opacity-50">
            {t("releaseAll", { count: pending.length })}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label={t("cards.pending")} value={f.money(sum(pending, (r) => r.merchantProfit))} note={t("cards.pendingNote", { count: pending.length })} icon={<ClockIcon size={18} />} tone="warn" />
        <StatCard label={t("cards.available")} value={f.money(sum(all.filter((r) => r.status === "available"), (r) => r.merchantProfit))} note={t("cards.availableNote")} icon={<WalletIcon size={18} />} />
        <StatCard label={t("cards.kandrop")} value={f.money(sum(all, (r) => r.productCost + r.deliveryFee))} note={t("cards.kandropNote")} icon={<TrendingUpIcon size={18} />} />
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
                <th className="px-4 py-3 text-right">{t("cols.delivery")}</th>
                <th className="px-2 py-3 text-center">+</th>
                <th className="px-4 py-3 text-right">{t("cols.profit")}</th>
                <th className="px-4 py-3">{t("cols.status")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pager.slice.map((r) => {
                const balanced = r.total === r.productCost + r.deliveryFee + r.merchantProfit;
                return (
                  <tr key={r.orderId} className="border-b border-gray-100 last:border-b-0 hover:bg-[var(--ink-50)]">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="mono-num font-bold">#{r.number}</p>
                      <p className="text-[12px] text-[var(--ink-500)]">{dateOnly(r.deliveredAt, locale)}</p>
                    </td>
                    <td className="px-4 py-3"><Link href={`/admin/lojistas/${r.merchantId}`} className="font-semibold text-[var(--ink-900)] hover:text-[var(--kai-orange-600)]">{merchantById(r.merchantId)?.store}</Link></td>
                    <td className="mono-num px-4 py-3 text-right font-extrabold text-[var(--ink-900)]">{f.money(r.total)}</td>
                    <td className="px-2 text-center text-[var(--ink-300)]" title={balanced ? t("balanced") : t("unbalanced")}>{balanced ? "=" : "≠"}</td>
                    <td className="mono-num px-4 py-3 text-right text-[var(--ink-700)]">{f.money(r.productCost)}</td>
                    <td className="px-2 text-center text-[var(--ink-300)]">+</td>
                    <td className="mono-num px-4 py-3 text-right text-[var(--kai-orange-600)]">{f.money(r.deliveryFee)}</td>
                    <td className="px-2 text-center text-[var(--ink-300)]">+</td>
                    <td className="mono-num px-4 py-3 text-right font-bold text-[var(--kai-success)]">{f.money(r.merchantProfit)}</td>
                    <td className="px-4 py-3"><Badge tone={r.status === "available" ? "success" : "warn"}>{t(`status.${r.status}`)}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      {r.status === "pending" && (
                        <button type="button" onClick={() => release([r.orderId])} className="h-9 rounded-full bg-brand-orange px-3.5 text-[12px] font-bold whitespace-nowrap text-brand-black">{t("release")}</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pager pager={pager} />
      </div>
      <p className="mt-4 text-center text-[12px] text-[var(--ink-500)]">{t("demoNote")}</p>
    </div>
  );
}
