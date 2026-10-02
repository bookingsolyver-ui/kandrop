"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { ClockIcon, WalletIcon } from "@/components/kai/icons";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { useRouter } from "@/i18n/navigation";
import type { AdminMerchantPayout } from "@/server/modules/payouts/admin";
import type { AdminWithdrawal, WithdrawalStatus } from "@/server/modules/supplier/withdrawals";
import { Badge, Pager, PageHeader, StatCard, card, dateOnly, usePager } from "./ui";

const TONE = { paid: "success", requested: "warn", rejected: "danger" } as const;

function Body({ rows, merchantRows }: { rows: AdminWithdrawal[]; merchantRows: AdminMerchantPayout[] }) {
  const t = useTranslations("Admin.payouts");
  const f = useFormatters();
  const locale = useLocale();
  const toast = useToast();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | WithdrawalStatus>("requested");
  const [busy, setBusy] = useState<string | null>(null);

  const shown = rows.filter((r) => filter === "all" || r.status === filter);
  const pager = usePager(shown, 20);
  const pending = rows.filter((r) => r.status === "requested");
  const merchantPending = merchantRows.filter((r) => r.status === "pending");
  const sum = (list: AdminWithdrawal[]) => list.reduce((n, r) => n + r.amount - r.fee, 0);

  const decide = async (id: string, status: "paid" | "rejected", kind: "withdrawals" | "payouts" = "withdrawals") => {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/${kind}/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (res.ok) {
        toast({ message: t(status === "paid" ? "toast.paid" : "toast.rejected") });
        router.refresh();
      } else toast({ message: t("toast.failed") });
    } finally {
      setBusy(null);
    }
  };
  const exportCsv = async () => {
    const res = await fetch("/api/admin/withdrawals/export");
    if (!res.ok) return toast({ message: t("toast.failed") });
    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = `kandrop-lote-transferencias-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast({ message: t("toast.exported", { count: pending.length + merchantPending.length }) });
  };

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label={t("cards.pending")} value={String(pending.length)} note={f.money(sum(pending))} icon={<ClockIcon size={18} />} tone="warn" />
        <StatCard label={t("cards.paid")} value={f.money(sum(rows.filter((r) => r.status === "paid")))} note={t("cards.paidNote")} icon={<WalletIcon size={18} />} />
        <StatCard label={t("cards.total")} value={String(rows.length)} note={t("cards.totalNote")} icon={<WalletIcon size={18} />} />
      </div>

      <section className={`${card} mt-6 flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between`} aria-labelledby="batch-title">
        <div>
          <h2 id="batch-title" className="text-[17px] font-bold tracking-tight">{t("batch.title")}</h2>
          <p className="mt-1 max-w-2xl text-[13px] text-[var(--ink-600)]">{t("batch.body")}</p>
        </div>
        <button type="button" onClick={() => void exportCsv()} disabled={pending.length + merchantPending.length === 0}
          className="inline-flex h-11 items-center rounded-full border border-[var(--ink-200)] bg-white px-5 text-sm font-semibold text-[var(--ink-900)] hover:border-[var(--ink-300)] disabled:opacity-50">
          {t("batch.export", { count: pending.length + merchantPending.length })}
        </button>
      </section>

      <div className={`${card} mt-6 overflow-hidden`}>
        <div role="group" className="flex flex-wrap gap-1.5 border-b border-[var(--ink-200)] p-4">
          {(["requested", "paid", "rejected", "all"] as const).map((k) => (
            <button key={k} type="button" aria-pressed={filter === k} onClick={() => { setFilter(k); pager.setPage(1); }}
              className={`rounded-full px-3.5 py-2 text-[13px] font-semibold ${filter === k ? "bg-[var(--ink-900)] text-white" : "text-[var(--ink-600)] hover:bg-[var(--ink-100)]"}`}>
              {k === "all" ? t("filters.all") : t(`status.${k}`)}
            </button>
          ))}
        </div>
        {shown.length === 0 ? <p className="px-6 py-16 text-center text-sm text-[var(--ink-600)]">{t("empty")}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] border-collapse text-sm">
              <thead className="border-b border-gray-100 bg-[var(--ink-50)]">
                <tr className="text-left text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase">
                  <th className="px-4 py-3">{t("cols.date")}</th>
                  <th className="px-4 py-3">{t("cols.supplier")}</th>
                  <th className="px-4 py-3">{t("cols.bank")}</th>
                  <th className="px-4 py-3 text-right">{t("cols.amount")}</th>
                  <th className="px-4 py-3">{t("cols.status")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {pager.slice.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 last:border-b-0 hover:bg-[var(--ink-50)]">
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--ink-600)]">{dateOnly(p.createdAt, locale)}</td>
                    <td className="px-4 py-3"><p className="font-semibold text-[var(--ink-900)]">{p.supplierName}</p><p className="mono-num text-[12px] text-[var(--ink-500)]">WD-{p.id.slice(0, 8).toUpperCase()}</p></td>
                    <td className="px-4 py-3 text-[var(--ink-600)]">{p.bank ? <>{p.bank.bankName}<span className="mono-num block text-[12px] text-[var(--ink-500)]">{p.bank.holderName} · {p.bank.ibanMasked}</span></> : "—"}</td>
                    <td className="mono-num px-4 py-3 text-right font-bold">{f.money(p.amount - p.fee)}{p.fee > 0 && <span className="block text-[12px] font-normal text-[var(--ink-500)]">{t("fee", { fee: f.money(p.fee) })}</span>}</td>
                    <td className="px-4 py-3"><Badge tone={TONE[p.status]}>{t(`status.${p.status}`)}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      {p.status === "requested" && (
                        <div className="flex justify-end gap-1.5">
                          <button type="button" disabled={busy === p.id} onClick={() => void decide(p.id, "paid")} className="h-9 rounded-full bg-brand-orange px-3.5 text-[12px] font-bold whitespace-nowrap text-brand-black disabled:opacity-50">{t("markPaid")}</button>
                          <button type="button" disabled={busy === p.id} onClick={() => void decide(p.id, "rejected")} className="h-9 rounded-full border border-[var(--ink-200)] bg-white px-3.5 text-[12px] font-semibold disabled:opacity-50">{t("reject")}</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager pager={pager} />
      </div>

      <section className={`${card} mt-6 overflow-hidden`} aria-labelledby="merchant-payouts">
        <h2 id="merchant-payouts" className="border-b border-[var(--ink-200)] px-5 py-4 text-[17px] font-bold tracking-tight">{t("merchants.title")}</h2>
        {merchantRows.length === 0 ? <p className="px-6 py-12 text-center text-sm text-[var(--ink-600)]">{t("merchants.empty")}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse text-sm">
              <tbody>
                {merchantRows.map((p) => {
                  const state = p.status === "completed" ? "paid" : p.status === "rejected" ? "rejected" : "requested";
                  return (
                    <tr key={p.id} className="border-b border-gray-100 last:border-b-0 hover:bg-[var(--ink-50)]">
                      <td className="px-4 py-3 whitespace-nowrap text-[var(--ink-600)]">{dateOnly(p.createdAt, locale)}</td>
                      <td className="px-4 py-3"><p className="font-semibold text-[var(--ink-900)]">{p.storeName}</p><p className="mono-num text-[12px] text-[var(--ink-500)]">{p.reference}</p></td>
                      <td className="px-4 py-3 text-[var(--ink-600)]">{p.holderName}<span className="mono-num block text-[12px] text-[var(--ink-500)]">{p.ibanMasked}</span></td>
                      <td className="mono-num px-4 py-3 text-right font-bold">{f.money(p.amount - p.fee)}{p.fee > 0 && <span className="block text-[12px] font-normal text-[var(--ink-500)]">{t("fee", { fee: f.money(p.fee) })}</span>}</td>
                      <td className="px-4 py-3"><Badge tone={TONE[state]}>{t(`status.${state}`)}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        {p.status === "pending" && (
                          <div className="flex justify-end gap-1.5">
                            <button type="button" disabled={busy === p.id} onClick={() => void decide(p.id, "paid", "payouts")} className="h-9 rounded-full bg-brand-orange px-3.5 text-[12px] font-bold whitespace-nowrap text-brand-black disabled:opacity-50">{t("markPaid")}</button>
                            <button type="button" disabled={busy === p.id} onClick={() => void decide(p.id, "rejected", "payouts")} className="h-9 rounded-full border border-[var(--ink-200)] bg-white px-3.5 text-[12px] font-semibold disabled:opacity-50">{t("reject")}</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/** Suppliers' withdrawals and merchants' payouts: mark them paid once the transfer was made (or reject them), and export the bank file. */
export function AdminPayoutsView({ rows, merchantRows }: { rows: AdminWithdrawal[]; merchantRows: AdminMerchantPayout[] }) {
  return (
    <ToastProvider>
      <Body rows={rows} merchantRows={merchantRows} />
    </ToastProvider>
  );
}
