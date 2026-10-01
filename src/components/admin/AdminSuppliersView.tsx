"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Badge, PageHeader, card, dateOnly } from "@/components/admin/ui";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { useRouter } from "@/i18n/navigation";

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
  const [tab, setTab] = useState<"approve" | "suppliers">("approve");

  const tabBtn = (key: typeof tab, label: string) => (
    <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
      className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === key ? "bg-brand-orange text-brand-black" : "text-[var(--ink-600)] hover:bg-[var(--ink-100)]"}`}>{label}</button>
  );

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div role="tablist" className="mb-5 flex flex-wrap gap-2">
        {tabBtn("approve", t("tabs.approve", { count: review.length }))}
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
        </>
      )}
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
