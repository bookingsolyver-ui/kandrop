"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import type { CatalogRow } from "@/shared/admin/types";
import { Badge, Pager, PageHeader, card, fold, usePager } from "./ui";

/** The catalogue as the operator sees it: cost, supplier, how many stores sell it, and whether it is visible. */
export function AdminCatalogView({ rows: all }: { rows: CatalogRow[] }) {
  const t = useTranslations("Admin.catalog");
  const f = useFormatters();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = fold(query.trim());
    return all.filter((p) => !q || fold(`${p.name} ${p.supplierName} ${p.category}`).includes(q));
  }, [all, query]);
  const pager = usePager(rows, 10);

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className={`${card} overflow-hidden`}>
        <div className="border-b border-[var(--ink-200)] p-4">
          <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); pager.setPage(1); }} placeholder={t("search")} aria-label={t("search")}
            className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20 lg:w-96" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <thead className="border-b border-gray-100 bg-[var(--ink-50)]">
              <tr className="text-left text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase">
                <th className="px-4 py-3">{t("cols.product")}</th>
                <th className="px-4 py-3">{t("cols.supplier")}</th>
                <th className="px-4 py-3 text-right">{t("cols.cost")}</th>
                <th className="px-4 py-3 text-right">{t("cols.stores")}</th>
                <th className="px-4 py-3">{t("cols.visibility")}</th>
              </tr>
            </thead>
            <tbody>
              {pager.slice.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 last:border-b-0 hover:bg-[var(--ink-50)]">
                  <td className="px-4 py-3"><p className="line-clamp-1 max-w-md font-semibold text-[var(--ink-900)]">{p.name}</p><p className="text-[12px] text-[var(--ink-500)]">{p.category}</p></td>
                  <td className="px-4 py-3 text-[var(--ink-600)]">{p.supplierName}</td>
                  <td className="mono-num px-4 py-3 text-right font-bold">{f.money(p.costPrice)}</td>
                  <td className="mono-num px-4 py-3 text-right text-[var(--ink-600)]">{p.stores}</td>
                  <td className="px-4 py-3"><Badge tone={p.status === "approved" ? "success" : p.status === "rejected" ? "danger" : "warn"}>{t(`status.${p.status}`)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="px-6 py-14 text-center text-sm text-[var(--ink-600)]">{t("empty")}</p>}
        <Pager pager={pager} />
      </div>
    </div>
  );
}
