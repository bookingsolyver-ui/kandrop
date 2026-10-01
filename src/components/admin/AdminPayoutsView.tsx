"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { useToast } from "@/components/ui/Toast";
import { Link } from "@/i18n/navigation";
import { PAYOUT_REQUESTS, merchantById, type PayoutRow } from "@/shared/admin/mock";
import { Badge, Pager, PageHeader, StatCard, card, dateOnly, usePager } from "./ui";
import { ClockIcon, WalletIcon } from "@/components/kai/icons";

const TONE = { paid: "success", pending: "warn", rejected: "danger" } as const;

/** Withdrawals asked for by the stores: approve or reject the pending ones. In memory only. */
export function AdminPayoutsView() {
  const t = useTranslations("Admin.payouts");
  const f = useFormatters();
  const locale = useLocale();
  const toast = useToast();
  const [overrides, setOverrides] = useState<Record<string, PayoutRow["status"]>>({});
  const rows = useMemo(() => PAYOUT_REQUESTS.map((p) => ({ ...p, status: overrides[p.id] ?? p.status })), [overrides]);
  const pager = usePager(rows, 10);
  const pending = rows.filter((r) => r.status === "pending");

  const decide = (id: string, status: "paid" | "rejected") => {
    setOverrides((o) => ({ ...o, [id]: status }));
    toast({ message: t(status === "paid" ? "toast.approved" : "toast.rejected") });
  };

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <StatCard label={t("cards.pending")} value={String(pending.length)} icon={<ClockIcon size={18} />} tone="warn" />
        <StatCard label={t("cards.amount")} value={f.money(pending.reduce((s, r) => s + r.amount, 0))} icon={<WalletIcon size={18} />} />
      </div>
      <div className={`${card} mt-6 overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] border-collapse text-sm">
            <thead className="border-b border-gray-100 bg-[var(--ink-50)]">
              <tr className="text-left text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase">
                <th className="px-4 py-3">{t("cols.date")}</th>
                <th className="px-4 py-3">{t("cols.merchant")}</th>
                <th className="px-4 py-3">{t("cols.bank")}</th>
                <th className="px-4 py-3 text-right">{t("cols.amount")}</th>
                <th className="px-4 py-3">{t("cols.status")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pager.slice.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 last:border-b-0 hover:bg-[var(--ink-50)]">
                  <td className="px-4 py-3 text-[var(--ink-600)]">{dateOnly(p.date, locale)}</td>
                  <td className="px-4 py-3"><Link href={`/admin/lojistas/${p.merchantId}`} className="font-semibold text-[var(--ink-900)] hover:text-[var(--kai-orange-600)]">{merchantById(p.merchantId)?.store}</Link></td>
                  <td className="px-4 py-3 text-[var(--ink-600)]">{p.bank}</td>
                  <td className="mono-num px-4 py-3 text-right font-bold">{f.money(p.amount)}</td>
                  <td className="px-4 py-3"><Badge tone={TONE[p.status]}>{t(`status.${p.status}`)}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    {p.status === "pending" && (
                      <div className="flex justify-end gap-1.5">
                        <button type="button" onClick={() => decide(p.id, "paid")} className="h-9 rounded-full bg-brand-orange px-3.5 text-[12px] font-bold text-brand-black">{t("approve")}</button>
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
    </div>
  );
}
