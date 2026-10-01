"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Badge, PageHeader, Pager, card, dateOnly, usePager } from "@/components/admin/ui";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { useRouter } from "@/i18n/navigation";
import { useSubmissions } from "@/lib/supplier/store";
import { SUPPLIERS, supplierById, type SubmissionStatus } from "@/shared/supplier/mock";

const TONE = { approved: "success", in_review: "warn", rejected: "danger" } as const;

export interface RealSupplierRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
}
export interface ReviewProductRow {
  id: string;
  name: string;
  supplierName: string;
  category: string;
  costPrice: number;
  stock: number;
  createdAt: number;
}
const REAL_TONE = { approved: "success", pending: "warn", rejected: "danger" } as const;

function Body({ real, review }: { real: RealSupplierRow[]; review: ReviewProductRow[] }) {
  const ct = useTranslations("Admin.suppliers.catalog");
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const reviewProduct = async (id: string, status: "approved" | "rejected") => {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/supplier-products/${id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (res.ok) {
        toast({ message: ct(status === "approved" ? "productApproved" : "productRejected") });
        router.refresh();
      } else toast({ message: t("real.failed") });
    } finally {
      setBusy(null);
    }
  };
  const setStatus = async (id: string, status: "approved" | "rejected") => {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/suppliers/${id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (res.ok) {
        toast({ message: t(status === "approved" ? "real.approved" : "real.rejected") });
        router.refresh();
      } else toast({ message: t("real.failed") });
    } finally {
      setBusy(null);
    }
  };
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
    const before = items.find((s) => s.id === id)?.status;
    decide(id, status);
    void fetch("/api/admin/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: status === "approved" ? "supplier_product.approve" : "supplier_product.reject", target: id, before: { status: before }, after: { status } }),
    }).catch(() => undefined);
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
        {tabBtn("approve", t("tabs.approve", { count: waiting + review.length }))}
        {tabBtn("suppliers", t("tabs.suppliers", { count: real.length }))}
      </div>

      {tab === "approve" ? (
        <>
        <section className={`${card} mb-6 overflow-x-auto`}>
          <h2 className="border-b border-[var(--ink-200)] px-5 py-4 text-[17px] font-bold tracking-tight">{ct("reviewTitle")}</h2>
          {review.length === 0 ? <p className="px-6 py-10 text-center text-sm text-[var(--ink-600)]">{ct("reviewEmpty")}</p> : (
            <table className="w-full min-w-[48rem] border-collapse text-sm">
              <tbody>
                {review.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-3 font-semibold">{p.name}<span className="block text-[12px] font-normal text-[var(--ink-500)]">{ct("supplier")}: {p.supplierName} · {p.category}</span></td>
                    <td className="mono-num px-4 py-3 text-right font-bold">{f.money(p.costPrice)}</td>
                    <td className="mono-num px-4 py-3 text-right text-[var(--ink-600)]">{t("stockUnits", { count: p.stock })}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--ink-600)]">{dateOnly(p.createdAt, locale)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" disabled={busy === p.id} onClick={() => void reviewProduct(p.id, "approved")} className="h-9 rounded-full bg-[var(--ink-900)] px-4 text-[13px] font-semibold text-white hover:bg-black disabled:opacity-50">{t("approve")}</button>
                        <button type="button" disabled={busy === p.id} onClick={() => void reviewProduct(p.id, "rejected")} className="h-9 rounded-full border border-[var(--ink-200)] bg-white px-4 text-[13px] font-semibold text-[var(--ink-700)] hover:border-[var(--ink-300)] disabled:opacity-50">{t("reject")}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
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
        </>
      ) : (
        <>
        <section className={`${card} mb-6 overflow-x-auto`}>
          <h2 className="border-b border-[var(--ink-200)] px-5 py-4 text-[17px] font-bold tracking-tight">{t("real.title")}</h2>
          {real.length === 0 ? <p className="px-6 py-10 text-center text-sm text-[var(--ink-600)]">{t("real.empty")}</p> : (
            <table className="w-full min-w-[48rem] border-collapse text-sm">
              <tbody>
                {real.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-3 font-semibold">{r.name}<span className="block text-[12px] font-normal text-[var(--ink-500)]">{r.email}{r.phone ? ` · ${r.phone}` : ""}</span></td>
                    <td className="px-4 py-3 text-[var(--ink-600)]">{r.address ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--ink-600)]">{dateOnly(r.createdAt, locale)}</td>
                    <td className="px-4 py-3"><Badge tone={REAL_TONE[r.status]}>{t(`real.status.${r.status}`)}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {r.status !== "approved" && <button type="button" disabled={busy === r.id} onClick={() => void setStatus(r.id, "approved")} className="h-9 rounded-full bg-[var(--ink-900)] px-4 text-[13px] font-semibold text-white hover:bg-black disabled:opacity-50">{t("approve")}</button>}
                        {r.status !== "rejected" && <button type="button" disabled={busy === r.id} onClick={() => void setStatus(r.id, "rejected")} className="h-9 rounded-full border border-[var(--ink-200)] bg-white px-4 text-[13px] font-semibold text-[var(--ink-700)] hover:border-[var(--ink-300)] disabled:opacity-50">{t("reject")}</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className={`${card} overflow-x-auto`}>
          <h2 className="border-b border-[var(--ink-200)] px-5 py-4 text-[17px] font-bold tracking-tight">{t("real.demoTitle")}</h2>
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
        </>
      )}
      <p className="mt-4 text-center text-[12px] text-[var(--ink-500)]">{t("demoNote")}</p>
    </div>
  );
}

/** The team's side of the marketplace: approve what suppliers submit and see who they are. */
export function AdminSuppliersView({ real, review }: { real: RealSupplierRow[]; review: ReviewProductRow[] }) {
  return (
    <ToastProvider>
      <Body real={real} review={review} />
    </ToastProvider>
  );
}
