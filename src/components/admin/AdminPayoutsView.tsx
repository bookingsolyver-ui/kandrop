"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { ClockIcon, WalletIcon } from "@/components/kai/icons";
import { useToast } from "@/components/ui/Toast";
import { PAYOUT_QUEUE, type PayoutQueueItem } from "@/shared/admin/mock";
import { Badge, Pager, PageHeader, StatCard, card, dateOnly, usePager } from "./ui";

type Status = PayoutQueueItem["status"] | "approved";
const TONE = { paid: "success", pending: "warn", rejected: "danger", approved: "brand" } as const;

/** `;`-separated with a BOM, which is what Excel in Portuguese opens without asking questions. */
function toCsv(rows: Array<Omit<PayoutQueueItem, "status">>) {
  const head = ["referencia", "lojista", "titular", "banco", "iban", "valor_kwz", "data"];
  const lines = rows.map((r) =>
    [r.id, r.store, r.holder, r.bank, r.iban, Math.round(r.amount / 100), new Date(r.date).toISOString().slice(0, 10)]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(";")
  );
  return `﻿${[head.join(";"), ...lines].join("\r\n")}\r\n`;
}

/** The withdrawals queue and the batch closing: approve the pending ones, export the transfer file. */
export function AdminPayoutsView() {
  const t = useTranslations("Admin.payouts");
  const f = useFormatters();
  const locale = useLocale();
  const toast = useToast();
  const [decided, setDecided] = useState<Record<string, "approved" | "rejected">>({});

  const rows = useMemo(() => PAYOUT_QUEUE.map((p) => ({ ...p, status: (decided[p.id] ?? p.status) as Status })), [decided]);
  const pager = usePager(rows, 20);
  const pending = rows.filter((r) => r.status === "pending");
  const approved = rows.filter((r) => r.status === "approved");
  const sum = (list: typeof rows) => list.reduce((s, r) => s + r.amount, 0);

  const decide = (id: string, status: "approved" | "rejected") => {
    setDecided((d) => ({ ...d, [id]: status }));
    toast({ message: t(status === "approved" ? "toast.approved" : "toast.rejected") });
  };
  const approveAll = () => {
    setDecided((d) => ({ ...d, ...Object.fromEntries(pending.map((r) => [r.id, "approved" as const])) }));
    toast({ message: t("toast.batch", { count: pending.length }) });
  };
  const exportCsv = () => {
    const blob = new Blob([toCsv(approved)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kandrop-lote-transferencias-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast({ message: t("toast.exported", { count: approved.length }) });
  };

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label={t("cards.pending")} value={String(pending.length)} note={f.money(sum(pending))} icon={<ClockIcon size={18} />} tone="warn" />
        <StatCard label={t("cards.approved")} value={String(approved.length)} note={f.money(sum(approved))} icon={<WalletIcon size={18} />} />
        <StatCard label={t("cards.total")} value={f.money(sum(pending) + sum(approved))} note={t("cards.totalNote")} icon={<WalletIcon size={18} />} />
      </div>

      <section className={`${card} mt-6 flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between`} aria-labelledby="batch-title">
        <div>
          <h2 id="batch-title" className="text-[17px] font-bold tracking-tight">{t("batch.title")}</h2>
          <p className="mt-1 max-w-2xl text-[13px] text-[var(--ink-600)]">{t("batch.body")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={approveAll} disabled={pending.length === 0}
            className="inline-flex h-11 items-center rounded-full bg-brand-orange px-5 text-sm font-bold text-brand-black disabled:opacity-50">
            {t("batch.approveAll", { count: pending.length })}
          </button>
          <button type="button" onClick={exportCsv} disabled={approved.length === 0}
            className="inline-flex h-11 items-center rounded-full border border-[var(--ink-200)] bg-white px-5 text-sm font-semibold text-[var(--ink-900)] hover:border-[var(--ink-300)] disabled:opacity-50">
            {t("batch.export", { count: approved.length })}
          </button>
        </div>
      </section>

      <div className={`${card} mt-6 overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[68rem] border-collapse text-sm">
            <thead className="border-b border-gray-100 bg-[var(--ink-50)]">
              <tr className="text-left text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase">
                <th className="px-4 py-3">{t("cols.date")}</th>
                <th className="px-4 py-3">{t("cols.merchant")}</th>
                <th className="px-4 py-3">{t("cols.bank")}</th>
                <th className="px-4 py-3">{t("cols.iban")}</th>
                <th className="px-4 py-3 text-right">{t("cols.amount")}</th>
                <th className="px-4 py-3">{t("cols.status")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pager.slice.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 last:border-b-0 hover:bg-[var(--ink-50)]">
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--ink-600)]">{dateOnly(p.date, locale)}</td>
                  <td className="px-4 py-3"><p className="font-semibold text-[var(--ink-900)]">{p.store}</p><p className="mono-num text-[12px] text-[var(--ink-500)]">{p.id} · {p.holder}</p></td>
                  <td className="px-4 py-3 text-[var(--ink-600)]">{p.bank}</td>
                  <td className="mono-num px-4 py-3 text-[12px] whitespace-nowrap text-[var(--ink-600)]">{p.iban.replace(/(.{4})/g, "$1 ").trim()}</td>
                  <td className="mono-num px-4 py-3 text-right font-bold">{f.money(p.amount)}</td>
                  <td className="px-4 py-3"><Badge tone={TONE[p.status]}>{t(`status.${p.status}`)}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    {p.status === "pending" && (
                      <div className="flex justify-end gap-1.5">
                        <button type="button" onClick={() => decide(p.id, "approved")} className="h-9 rounded-full bg-brand-orange px-3.5 text-[12px] font-bold text-brand-black">{t("approve")}</button>
                        <button type="button" onClick={() => decide(p.id, "rejected")} className="h-9 rounded-full border border-[var(--ink-200)] bg-white px-3.5 text-[12px] font-semibold">{t("reject")}</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager pager={pager} />
      </div>
      <p className="mt-4 text-center text-[12px] text-[var(--ink-500)]">{t("demoNote")}</p>
    </div>
  );
}
