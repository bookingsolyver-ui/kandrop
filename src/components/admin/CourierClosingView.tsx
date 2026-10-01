"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { ClockIcon, WalletIcon } from "@/components/kai/icons";
import { useToast } from "@/components/ui/Toast";
import { COURIER_CLOSINGS } from "@/shared/admin/mock";
import { Badge, PageHeader, StatCard, card } from "./ui";

/** End-of-day closing of the couriers who collected on delivery: cash to hand in vs what was counted. */
export function CourierClosingView() {
  const t = useTranslations("Admin.couriers");
  const f = useFormatters();
  const toast = useToast();
  const [confirmed, setConfirmed] = useState<Record<string, number>>(() =>
    Object.fromEntries(COURIER_CLOSINGS.filter((c) => c.status === "confirmed").map((c) => [c.courier, c.cash]))
  );
  const [counted, setCounted] = useState<Record<string, string>>({});

  const rows = COURIER_CLOSINGS.map((c) => {
    const isConfirmed = c.courier in confirmed;
    const input = counted[c.courier];
    const value = isConfirmed ? confirmed[c.courier]! : input === undefined || input === "" ? null : Math.round(Number(input.replace(/\s/g, "").replace(",", ".")) * 100);
    return { ...c, isConfirmed, value, difference: value === null || Number.isNaN(value) ? null : value - c.cash };
  });
  const toCollect = rows.filter((r) => !r.isConfirmed).reduce((s, r) => s + r.cash, 0);
  const tpaTotal = rows.reduce((s, r) => s + r.tpa, 0);

  const confirm = (courier: string, value: number, difference: number) => {
    setConfirmed((c) => ({ ...c, [courier]: value }));
    toast({ message: t(difference === 0 ? "toast.confirmed" : "toast.confirmedDiff") });
  };

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label={t("cards.cash")} value={f.money(toCollect)} note={t("cards.cashNote")} icon={<WalletIcon size={18} />} tone="warn" />
        <StatCard label={t("cards.tpa")} value={f.money(tpaTotal)} note={t("cards.tpaNote")} icon={<WalletIcon size={18} />} />
        <StatCard label={t("cards.pending")} value={String(rows.filter((r) => !r.isConfirmed).length)} note={t("cards.pendingNote", { total: rows.length })} icon={<ClockIcon size={18} />} />
      </div>

      <div className={`${card} mt-6 overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[64rem] border-collapse text-sm">
            <thead className="border-b border-gray-100 bg-[var(--ink-50)]">
              <tr className="text-left text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase">
                <th className="px-4 py-3">{t("cols.courier")}</th>
                <th className="px-4 py-3 text-right">{t("cols.delivered")}</th>
                <th className="px-4 py-3 text-right">{t("cols.tpa")}</th>
                <th className="px-4 py-3 text-right">{t("cols.cash")}</th>
                <th className="px-4 py-3 text-right">{t("cols.counted")}</th>
                <th className="px-4 py-3 text-right">{t("cols.difference")}</th>
                <th className="px-4 py-3">{t("cols.status")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.courier} className="border-b border-gray-100 last:border-b-0 hover:bg-[var(--ink-50)]">
                  <td className="px-4 py-3"><p className="font-semibold text-[var(--ink-900)]">{r.courier}</p><p className="text-[12px] text-[var(--ink-500)]">{r.zone}</p></td>
                  <td className="mono-num px-4 py-3 text-right font-semibold">{r.delivered}</td>
                  <td className="mono-num px-4 py-3 text-right text-[var(--ink-600)]">{f.money(r.tpa)}</td>
                  <td className="mono-num px-4 py-3 text-right font-extrabold text-[var(--ink-900)]">{f.money(r.cash)}</td>
                  <td className="px-4 py-3 text-right">
                    {r.isConfirmed ? (
                      <span className="mono-num font-semibold">{f.money(r.value!)}</span>
                    ) : (
                      <input
                        inputMode="decimal"
                        aria-label={t("cols.counted")}
                        placeholder={String(Math.round(r.cash / 100))}
                        value={counted[r.courier] ?? ""}
                        onChange={(e) => setCounted((c) => ({ ...c, [r.courier]: e.target.value }))}
                        className="mono-num h-9 w-32 rounded-xl border border-border bg-white px-2.5 text-right text-sm outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20"
                      />
                    )}
                  </td>
                  <td className={`mono-num px-4 py-3 text-right font-bold ${r.difference === null ? "text-[var(--ink-300)]" : r.difference === 0 ? "text-[var(--kai-success)]" : "text-down"}`}>
                    {r.difference === null ? "—" : `${r.difference > 0 ? "+" : ""}${f.money(r.difference)}`}
                  </td>
                  <td className="px-4 py-3"><Badge tone={r.isConfirmed ? "success" : "warn"}>{t(r.isConfirmed ? "status.confirmed" : "status.pending")}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    {!r.isConfirmed && (
                      <button type="button" disabled={r.value === null || Number.isNaN(r.value)} onClick={() => confirm(r.courier, r.value!, r.difference!)}
                        className="h-9 rounded-full bg-brand-orange px-3.5 text-[12px] font-bold whitespace-nowrap text-brand-black disabled:opacity-40">
                        {r.difference ? t("confirmDiff") : t("confirm")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-4 text-center text-[12px] text-[var(--ink-500)]">{t("demoNote")}</p>
    </div>
  );
}
