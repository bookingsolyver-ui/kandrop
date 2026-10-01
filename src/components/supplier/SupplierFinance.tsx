"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { Badge, Modal, Pager, PageHeader, StatCard, card, dateOnly, usePager } from "@/components/admin/ui";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { ClockIcon, WalletIcon } from "@/components/kai/icons";
import { BRAND_BUTTON_CLASS } from "@/components/ui/BrandButton";
import { useToast } from "@/components/ui/Toast";
import { saveBankDetailsAction } from "@/app/[locale]/fornecedor/(portal)/actions";
import { useRouter } from "@/i18n/navigation";
import { formatIbanInput } from "@/shared/bank/schemas";
import { bankDetailsSchema } from "@/shared/supplier/schemas";
import { useCurrentSupplier, useWithdrawals } from "@/lib/supplier/store";
import { payoutsOfSupplier, salesOfSupplier } from "@/shared/supplier/mock";

const MIN = 500_000; // 5 000 kwz, in minor units

/** What the supplier earns (the cost price of each product a merchant sells) and the withdrawals. */
/** The payout account as the server sends it: the IBAN is already masked, the full number never leaves the server. */
export interface BankView {
  bankName: string;
  holderName: string;
  ibanMasked: string;
  updatedAt: number;
}

export function SupplierFinance({ bank }: { bank: BankView | null }) {
  const t = useTranslations("Supplier.finance");
  const f = useFormatters();
  const locale = useLocale();
  const toast = useToast();
  const { supplier, seeded } = useCurrentSupplier();
  const { withdrawals, request } = useWithdrawals(supplier?.id ?? null);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const router = useRouter();
  const bt = useTranslations("Supplier.finance.bank");
  const bv = useTranslations("Settings.bank.validation");
  const sv = useTranslations("Supplier.validation");
  const [bankOpen, setBankOpen] = useState(false);
  const [bankPending, startBank] = useTransition();
  const [bankForm, setBankForm] = useState({ bankName: "", holderName: "", iban: "", password: "" });
  const [bankErrors, setBankErrors] = useState<Record<string, string>>({});
  const [bankFailure, setBankFailure] = useState<string | null>(null);
  const bankMessage = (code: string) => (code === "bank_required" ? sv("bank_required") : bv(code as Parameters<typeof bv>[0]));
  const closeBank = () => { setBankOpen(false); setBankForm({ bankName: "", holderName: "", iban: "", password: "" }); setBankErrors({}); setBankFailure(null); };
  const submitBank = () => {
    setBankFailure(null);
    const parsed = bankDetailsSchema.safeParse(bankForm);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) { const k = String(i.path[0]); if (!next[k]) next[k] = bankMessage(i.message); }
      return setBankErrors(next);
    }
    setBankErrors({});
    startBank(async () => {
      // The password and the IBAN travel to the server once; the IBAN is encrypted there before it is stored.
      const result = await saveBankDetailsAction(bankForm);
      if (result.ok) {
        toast({ message: bt("saved") });
        closeBank();
        router.refresh();
      } else if (result.error === "validation") {
        const next: Record<string, string> = {};
        for (const [k, code] of Object.entries(result.fields)) next[k] = bankMessage(code);
        setBankErrors(next);
      } else if (result.error === "password_incorrect") setBankErrors({ password: bv("password_incorrect") });
      else setBankFailure(bt(result.error === "rate_limited" ? "rateLimited" : "failed"));
    });
  };

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

      <section className={`${card} mt-6 p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-[17px] font-bold tracking-tight">{bt("title")}</h2>
            {bank ? (
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex gap-2"><dt className="w-20 text-[var(--ink-500)]">{bt("bank")}</dt><dd className="font-semibold">{bank.bankName}</dd></div>
                <div className="flex gap-2"><dt className="w-20 text-[var(--ink-500)]">{bt("holder")}</dt><dd className="font-semibold">{bank.holderName}</dd></div>
                <div className="flex gap-2"><dt className="w-20 text-[var(--ink-500)]">IBAN</dt><dd className="mono-num font-semibold">{bank.ibanMasked}</dd></div>
              </dl>
            ) : <p className="mt-2 text-sm text-[var(--ink-600)]">{bt("none")}</p>}
          </div>
          <button type="button" onClick={() => setBankOpen(true)} className="inline-flex h-10 items-center rounded-full border border-[var(--ink-200)] bg-white px-4 text-sm font-semibold hover:border-[var(--ink-300)]">{bt(bank ? "change" : "add")}</button>
        </div>
      </section>

      <Modal open={bankOpen} onClose={closeBank} title={bt("modalTitle")}>
        <form onSubmit={(e) => { e.preventDefault(); submitBank(); }} noValidate autoComplete="off" className="space-y-4">
          {bankFailure && <div role="alert" className="rounded-xl border border-down px-3.5 py-3 text-[13px] text-down">{bankFailure}</div>}
          {(["bankName", "holderName", "iban", "password"] as const).map((k) => (
            <label key={k} className="block">
              <span className="text-xs font-semibold tracking-wide text-[var(--ink-700)] uppercase">{bt(`fields.${k}`)}</span>
              <input
                type={k === "password" ? "password" : "text"}
                autoComplete={k === "password" ? "current-password" : "off"}
                inputMode={k === "iban" ? "text" : undefined}
                placeholder={k === "iban" ? "AO06 0000 0000 0000 0000 0000 0" : undefined}
                value={bankForm[k]}
                onChange={(e) => setBankForm((b) => ({ ...b, [k]: k === "iban" ? formatIbanInput(e.target.value) : e.target.value }))}
                aria-invalid={!!bankErrors[k]}
                className={`mt-1.5 h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${k === "iban" ? "mono-num" : ""} ${bankErrors[k] ? "border-down" : "border-border"}`}
              />
              {bankErrors[k] && <span role="alert" className="mt-1 block text-[12px] text-down">{bankErrors[k]}</span>}
            </label>
          ))}
          <p className="text-[12px] text-[var(--ink-500)]">{bt("securityNote")}</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeBank} className="inline-flex h-10 items-center rounded-full border border-[var(--ink-200)] bg-white px-4 text-sm font-semibold">{t("modal.cancel")}</button>
            <button type="submit" disabled={bankPending} className={`${BRAND_BUTTON_CLASS} h-10 px-5 text-sm`}>{bankPending ? bt("saving") : bt("save")}</button>
          </div>
        </form>
      </Modal>

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
