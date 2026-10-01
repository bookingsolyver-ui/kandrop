"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { SearchIcon } from "@/components/kai/icons";
import { Link } from "@/i18n/navigation";
import type { MerchantRow, MerchantStatus } from "@/shared/admin/types";
import { Badge, Pager, PageHeader, card, fold, usePager } from "./ui";

export const STATUS_TONE = { active: "success", suspended: "danger", pending_verification: "warn" } as const;
const FILTERS: Array<"all" | MerchantStatus> = ["all", "active", "suspended", "pending_verification"];

/** Every store on the platform, with its balance and activity; a click opens its full profile. */
export function MerchantsView({ merchants }: { merchants: MerchantRow[] }) {
  const t = useTranslations("Admin.merchants");
  const f = useFormatters();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const rows = useMemo(() => {
    const q = fold(query.trim());
    return merchants.filter((m) => (filter === "all" || m.status === filter) && (!q || fold(`${m.store} ${m.owner} ${m.email} ${m.province ?? ""} ${m.municipality ?? ""}`).includes(q)));
  }, [merchants, query, filter]);
  const pager = usePager(rows, 10);

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className={`${card} overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-[var(--ink-200)] p-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="group relative block lg:w-96">
            <span className="sr-only">{t("search")}</span>
            <span className="absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--ink-500)]"><SearchIcon size={16} /></span>
            <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); pager.setPage(1); }} placeholder={t("search")}
              className="h-11 w-full rounded-xl border border-border bg-white pr-3 pl-10 text-sm outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20" />
          </label>
          <div role="group" className="flex flex-wrap gap-1.5">
            {FILTERS.map((s) => (
              <button key={s} type="button" aria-pressed={filter === s} onClick={() => { setFilter(s); pager.setPage(1); }}
                className={`rounded-full px-3.5 py-2 text-[13px] font-semibold ${filter === s ? "bg-[var(--ink-900)] text-white" : "text-[var(--ink-600)] hover:bg-[var(--ink-100)]"}`}>
                {t(`filters.${s}`)} ({s === "all" ? merchants.length : merchants.filter((m) => m.status === s).length})
              </button>
            ))}
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-[var(--ink-600)]">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[60rem] border-collapse text-sm">
              <thead className="border-b border-gray-100 bg-[var(--ink-50)]">
                <tr className="text-left text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase">
                  <th className="px-4 py-3">{t("cols.store")}</th>
                  <th className="px-4 py-3">{t("cols.city")}</th>
                  <th className="px-4 py-3">{t("cols.plan")}</th>
                  <th className="px-4 py-3">{t("cols.status")}</th>
                  <th className="px-4 py-3 text-right">{t("cols.balance")}</th>
                  <th className="px-4 py-3 text-right">{t("cols.orders")}</th>
                  <th className="px-4 py-3 text-right">{t("cols.gmv")}</th>
                  <th className="w-24 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {pager.slice.map((m) => (
                  <tr key={m.id} className="border-b border-gray-100 last:border-b-0 hover:bg-[var(--ink-50)]">
                    <td className="px-4 py-3">
                      <Link href={`/admin/lojistas/${m.id}`} className="block font-semibold text-[var(--ink-900)] hover:text-[var(--kai-orange-600)]">{m.store}</Link>
                      <span className="text-[12px] text-[var(--ink-500)]">{m.owner} · {m.email}</span>
                    </td>
                    <td className="px-4 py-3 text-[var(--ink-600)]">{[m.municipality, m.province].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-4 py-3"><Badge tone={m.plan === "pro" ? "brand" : "neutral"}>{t(`plan.${m.plan}`)}</Badge></td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONE[m.status]}>{t(`status.${m.status}`)}</Badge></td>
                    <td className="mono-num px-4 py-3 text-right font-bold text-[var(--ink-900)]">{f.money(m.balance)}</td>
                    <td className="mono-num px-4 py-3 text-right text-[var(--ink-600)]">{m.totalOrders}</td>
                    <td className="mono-num px-4 py-3 text-right text-[var(--ink-600)]">{f.money(m.gmv)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/lojistas/${m.id}`} className="inline-flex h-9 items-center rounded-full border border-[var(--ink-200)] bg-white px-4 text-[13px] font-semibold text-[var(--ink-900)] hover:border-[var(--ink-300)]">{t("open")}</Link>
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
