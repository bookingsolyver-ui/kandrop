"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Badge, PageHeader, Pager, card, dateOnly, usePager } from "@/components/admin/ui";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { useSubmissions } from "@/lib/supplier/store";
import { SUPPLIERS, supplierById, type SubmissionStatus } from "@/shared/supplier/mock";

const TONE = { approved: "success", in_review: "warn", rejected: "danger" } as const;

function Body() {
  const t = useTranslations("Admin.suppliers");
  const f = useFormatters();
  const locale = useLocale();
  const toast = useToast();
  const { items, decide } = useSubmissions();
  const [tab, setTab] = useState<"approve" | "suppliers">("approve");
  const [filter, setFilter] = useState<SubmissionStatus>("in_review");

  const rows = useMemo(() => items.filter((s) => s.status === filter), [items, filter]);
  const pager = usePager(rows, 10);
  const waiting = items.filter((s) => s.status === "in_review").length;

  const act = (id: string, status: "approved" | "rejected") => {
    decide(id, status);
    toast({ message: t(status === "approved" ? "toast.approved" : "toast.rejected") });
  };

  const tabBtn = (key: typeof tab, label: string) => (
    <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
      className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === key ? "bg-brand-orange text-brand-black" : "text-[var(--ink-600)] hover:bg-[var(--ink-100)]"}`}>{label}</button>
  );

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div role="tablist" className="mb-5 flex flex-wrap gap-2">
        {tabBtn("approve", t("tabs.approve", { count: waiting }))}
        {tabBtn("suppliers", t("tabs.suppliers", { count: SUPPLIERS.length }))}
      </div>

      {tab === "approve" ? (
        <section className={`${card} overflow-hidden`}>
          <div role="group" className="flex flex-wrap gap-1.5 border-b border-[var(--ink-200)] p-4">
            {(["in_review", "approved", "rejected"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={filter === k} onClick={() => { setFilter(k); pager.setPage(1); }}
                className={`rounded-full px-3.5 py-2 text-[13px] font-semibold ${filter === k ? "bg-[var(--ink-900)] text-white" : "text-[var(--ink-600)] hover:bg-[var(--ink-100)]"}`}>{t(`status.${k}`)}</button>
            ))}
          </div>
          {rows.length === 0 ? <p className="px-6 py-14 text-center text-sm text-[var(--ink-600)]">{t("empty")}</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[60rem] border-collapse text-sm">
                <thead className="border-b border-gray-100 bg-[var(--ink-50)]">
                  <tr className="text-left text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase">
                    <th className="px-4 py-3">{t("cols.product")}</th><th className="px-4 py-3">{t("cols.supplier")}</th>
                    <th className="px-4 py-3 text-right">{t("cols.cost")}</th><th className="px-4 py-3 text-right">{t("cols.suggested")}</th>
                    <th className="px-4 py-3">{t("cols.date")}</th><th className="px-4 py-3">{t("cols.status")}</th><th className="px-4 py-3 text-right">{t("cols.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pager.slice.map((s) => (
                    <tr key={s.id} className="border-b border-gray-100 last:border-b-0 hover:bg-[var(--ink-50)]">
                      <td className="px-4 py-3"><span className="line-clamp-2 max-w-xs font-semibold">{s.title}</span><span className="mono-num text-[12px] text-[var(--ink-500)]">{s.sku} · {s.weightKg} kg · {t("stockUnits", { count: s.stock })}</span></td>
                      <td className="px-4 py-3 text-[var(--ink-700)]">{supplierById(s.supplierId)?.name ?? s.supplierId}</td>
                      <td className="mono-num px-4 py-3 text-right font-bold">{f.money(s.costPrice)}</td>
                      <td className="mono-num px-4 py-3 text-right text-[var(--ink-600)]">{f.money(s.suggestedPrice)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-[var(--ink-600)]">{dateOnly(s.createdAt, locale)}</td>
                      <td className="px-4 py-3"><Badge tone={TONE[s.status]}>{t(`status.${s.status}`)}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {s.status !== "approved" && <button type="button" onClick={() => act(s.id, "approved")} className="h-9 rounded-full bg-[var(--ink-900)] px-4 text-[13px] font-semibold text-white hover:bg-black">{t("approve")}</button>}
                          {s.status !== "rejected" && <button type="button" onClick={() => act(s.id, "rejected")} className="h-9 rounded-full border border-[var(--ink-200)] bg-white px-4 text-[13px] font-semibold text-[var(--ink-700)] hover:border-[var(--ink-300)]">{t("reject")}</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pager pager={pager} />
        </section>
      ) : (
        <section className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[48rem] border-collapse text-sm">
            <thead className="border-b border-gray-100 bg-[var(--ink-50)]">
              <tr className="text-left text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase">
                <th className="px-4 py-3">{t("cols.supplier")}</th><th className="px-4 py-3">NIF</th><th className="px-4 py-3">{t("cols.origin")}</th>
                <th className="px-4 py-3">{t("cols.location")}</th><th className="px-4 py-3 text-right">{t("cols.rating")}</th>
              </tr>
            </thead>
            <tbody>
              {SUPPLIERS.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-4 py-3 font-semibold">{s.name}<span className="block text-[12px] font-normal text-[var(--ink-500)]">{s.email}</span></td>
                  <td className="mono-num px-4 py-3 text-[var(--ink-600)]">{s.nif}</td>
                  <td className="px-4 py-3"><Badge tone="neutral">{t(`kind.${s.kind}`)}</Badge></td>
                  <td className="px-4 py-3 text-[var(--ink-600)]">{s.municipality}, {s.province}</td>
                  <td className="mono-num px-4 py-3 text-right font-bold">★ {s.rating.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <p className="mt-4 text-center text-[12px] text-[var(--ink-500)]">{t("demoNote")}</p>
    </div>
  );
}

/** The team's side of the marketplace: approve what suppliers submit and see who they are. */
export function AdminSuppliersView() {
  return (
    <ToastProvider>
      <Body />
    </ToastProvider>
  );
}
