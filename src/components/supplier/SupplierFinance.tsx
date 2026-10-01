"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Badge, Modal, Pager, PageHeader, StatCard, card, dateOnly, usePager } from "@/components/admin/ui";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { ClockIcon, WalletIcon } from "@/components/kai/icons";
import { BRAND_BUTTON_CLASS } from "@/components/ui/BrandButton";
import { useToast } from "@/components/ui/Toast";
import { useCurrentSupplier, useWithdrawals } from "@/lib/supplier/store";
import { payoutsOfSupplier, salesOfSupplier } from "@/shared/supplier/mock";

const MIN = 500_000; // 5 000 kwz, in minor units

/** What the supplier earns (the cost price of each product a merchant sells) and the withdrawals. */
export function SupplierFinance() {
  const t = useTranslations("Supplier.finance");
  const f = useFormatters();
  const locale = useLocale();
  const toast = useToast();
  const { supplier, seeded } = useCurrentSupplier();
  const { withdrawals, request } = useWithdrawals(supplier?.id ?? null);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");

  const sales = useMemo(() => (supplier && seeded ? salesOfSupplier(supplier.id) : []), [supplier, seeded]);
  const paid = useMemo(() => (supplier && seeded ? payoutsOfSupplier(supplier.id) : []), [supplier, seeded]);
  const sum = (list: typeof sales, status: "available" | "pending") => list.filter((s) => s.status === status).reduce((n, s) => n + s.amount, 0);
  const requested = withdrawals.reduce((n, w) => n + w.amount, 0);
  const available = Math.max(0, sum(sales, "available") - paid.reduce((n, p) => n + p.amount, 0) - requested);
  const pending = sum(sales, "pending");
  const pager = usePager(sales, 10);

  const kz = Number(amount.replace(/\s/g, "").replace(",", "."));
  const minor = Math.round(kz * 100);
  const valid = Number.isFinite(kz) && minor >= MIN && minor <= available;
  const close = () => { setOpen(false); setAmount(""); };
  const submit = () => {
    if (!valid) return;
    request(minor);
    toast({ message: t("toast.requested") });
    close();
  };

  if (!supplier) return null;
  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")}
        actions={<button type="button" onClick={() => { setAmount(String(Math.floor(available / 100))); setOpen(true); }} disabled={available < MIN} className={`${BRAND_BUTTON_CLASS} h-11 px-5 text-sm`}>{t("withdraw")}</button>} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <StatCard label={t("cards.available")} value={f.money(available)} note={t("cards.availableNote")} icon={<WalletIcon size={18} />} />
        <StatCard label={t("cards.pending")} value={f.money(pending)} note={t("cards.pendingNote")} icon={<ClockIcon size={18} />} tone="warn" />
      </div>

      <section className={`${card} mt-6 overflow-hidden`}>
        <h2 className="border-b border-[var(--ink-200)] px-5 py-4 text-[17px] font-bold tracking-tight">{t("sales.title")}</h2>
        {sales.length === 0 ? <p className="px-6 py-14 text-center text-sm text-[var(--ink-600)]">{t("sales.empty")}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse text-sm">
              <thead className="border-b border-gray-100 bg-[var(--ink-50)]">
                <tr className="text-left text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase">
                  <th className="px-4 py-3">{t("sales.cols.date")}</th><th className="px-4 py-3">{t("sales.cols.order")}</th>
                  <th className="px-4 py-3">{t("sales.cols.product")}</th><th className="px-4 py-3">{t("sales.cols.merchant")}</th>
                  <th className="px-4 py-3 text-right">{t("sales.cols.amount")}</th><th className="px-4 py-3">{t("sales.cols.status")}</th>
                </tr>
              </thead>
              <tbody>
                {pager.slice.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 last:border-b-0 hover:bg-[var(--ink-50)]">
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--ink-600)]">{dateOnly(s.at, locale)}</td>
                    <td className="mono-num px-4 py-3 font-semibold">#{s.orderNumber}</td>
                    <td className="px-4 py-3"><span className="line-clamp-1 max-w-xs font-semibold">{s.product}</span><span className="text-[12px] text-[var(--ink-500)]">{t("sales.qty", { count: s.quantity })}</span></td>
                    <td className="px-4 py-3 text-[var(--ink-600)]">{s.merchant}</td>
                    <td className="mono-num px-4 py-3 text-right font-bold">{f.money(s.amount)}</td>
                    <td className="px-4 py-3"><Badge tone={s.status === "available" ? "success" : "warn"}>{t(`sales.status.${s.status}`)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager pager={pager} />
      </section>

      <section className={`${card} mt-6 overflow-hidden`}>
        <h2 className="border-b border-[var(--ink-200)] px-5 py-4 text-[17px] font-bold tracking-tight">{t("history.title")}</h2>
        {withdrawals.length + paid.length === 0 ? <p className="px-6 py-10 text-center text-sm text-[var(--ink-600)]">{t("history.empty")}</p> : (
          <ul>
            {[...withdrawals.map((w) => ({ id: w.id, at: w.at, amount: w.amount, status: "pending" as const })), ...paid.map((p) => ({ id: p.id, at: p.at, amount: p.amount, status: "paid" as const }))].map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-3 last:border-b-0">
                <div><p className="mono-num font-semibold">{w.id}</p><p className="text-[12px] text-[var(--ink-500)]">{dateOnly(w.at, locale)}</p></div>
                <div className="flex items-center gap-4"><span className="mono-num font-bold">{f.money(w.amount)}</span><Badge tone={w.status === "paid" ? "success" : "warn"}>{t(`history.${w.status}`)}</Badge></div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-4 text-center text-[12px] text-[var(--ink-500)]">{t("demoNote")}</p>

      <Modal open={open} onClose={close} title={t("modal.title")}>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
          <p className="text-sm text-[var(--ink-600)]">{t("modal.available", { amount: f.money(available) })}</p>
          <label className="block"><span className="text-xs font-semibold tracking-wide text-[var(--ink-700)] uppercase">{t("modal.amount")}</span>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" aria-invalid={amount !== "" && !valid} className="mono-num mt-1.5 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20" />
            <span className="mt-1 block text-[12px] text-[var(--ink-500)]">{t("modal.help", { min: f.money(MIN) })}</span>
          </label>
          <p className="text-[12px] text-[var(--ink-500)]">{t("modal.destination", { name: supplier.name })}</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className="inline-flex h-10 items-center rounded-full border border-[var(--ink-200)] bg-white px-4 text-sm font-semibold">{t("modal.cancel")}</button>
            <button type="submit" disabled={!valid} className={`${BRAND_BUTTON_CLASS} h-10 px-5 text-sm`}>{t("modal.submit")}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
