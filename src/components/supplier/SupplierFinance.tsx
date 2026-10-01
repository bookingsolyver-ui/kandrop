"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { Badge, Modal, Pager, dateOnly, usePager } from "@/components/admin/ui";
import { EmptyState, Section, SupplierPageHeader, SupplierStat, inputClass, labelClass, panel, th } from "./ui";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { ClockIcon, WalletIcon } from "@/components/kai/icons";
import { BRAND_BUTTON_CLASS } from "@/components/ui/BrandButton";
import { useToast } from "@/components/ui/Toast";
import { saveBankDetailsAction } from "@/app/[locale]/fornecedor/(portal)/actions";
import { useRouter } from "@/i18n/navigation";
import { formatIbanInput } from "@/shared/bank/schemas";
import { bankDetailsSchema } from "@/shared/supplier/schemas";
import { useCurrentSupplier, useWithdrawals } from "@/lib/supplier/store";
import type { SupplierOrderRow } from "./types";

const MIN = 500_000; // 5 000 kwz, in minor units

/** What the supplier earns (the cost price of each product a merchant sells) and the withdrawals. */
/** The payout account as the server sends it: the IBAN is already masked, the full number never leaves the server. */
export interface BankView {
  bankName: string;
  holderName: string;
  ibanMasked: string;
  updatedAt: number;
}

export function SupplierFinance({ bank, orders }: { bank: BankView | null; orders: SupplierOrderRow[] }) {
  const t = useTranslations("Supplier.finance");
  const f = useFormatters();
  const locale = useLocale();
  const toast = useToast();
  const { supplier } = useCurrentSupplier();
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

  // Every order is worth the supplier's cost price; it becomes AVAILABLE once the parcel is delivered.
  const sales = useMemo(() => orders.map((o) => ({ ...o, money: o.costTotal, state: o.status === "delivered" ? ("available" as const) : ("pending" as const) })), [orders]);
  const sum = (state: "available" | "pending") => sales.filter((s) => s.state === state).reduce((n, s) => n + s.money, 0);
  const requested = withdrawals.reduce((n, w) => n + w.amount, 0);
  const available = Math.max(0, sum("available") - requested);
  const pending = sum("pending");
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
      <SupplierPageHeader title={t("title")} subtitle={t("subtitle")}
        actions={<button type="button" onClick={() => { setAmount(String(Math.floor(available / 100))); setOpen(true); }} disabled={available < MIN} className={`${BRAND_BUTTON_CLASS} h-11 px-5 text-sm`}>{t("withdraw")}</button>} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
        <SupplierStat label={t("cards.available")} value={f.money(available)} note={t("cards.availableNote")} icon={<WalletIcon size={18} />} />
        <SupplierStat label={t("cards.pending")} value={f.money(pending)} note={t("cards.pendingNote")} icon={<ClockIcon size={18} />} tone="warn" />
      </div>

      <section className={`${panel} mt-8 p-5 sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-[var(--ink-900)]">{bt("title")}</h2>
            {bank ? (
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex gap-2"><dt className="w-20 shrink-0 text-[var(--ink-500)]">{bt("bank")}</dt><dd className="font-semibold">{bank.bankName}</dd></div>
                <div className="flex gap-2"><dt className="w-20 shrink-0 text-[var(--ink-500)]">{bt("holder")}</dt><dd className="font-semibold">{bank.holderName}</dd></div>
                <div className="flex gap-2"><dt className="w-20 shrink-0 text-[var(--ink-500)]">IBAN</dt><dd className="mono-num font-semibold">{bank.ibanMasked}</dd></div>
              </dl>
            ) : <p className="mt-2 text-sm text-[var(--ink-600)]">{bt("none")}</p>}
          </div>
          <button type="button" onClick={() => setBankOpen(true)} className="inline-flex h-10 items-center rounded-full border border-[var(--ink-200)] bg-white px-5 text-sm font-semibold shadow-xs transition-colors hover:border-[var(--ink-300)] hover:bg-[var(--ink-50)]">{bt(bank ? "change" : "add")}</button>
        </div>
      </section>

      <Modal open={bankOpen} onClose={closeBank} title={bt("modalTitle")}>
        <form onSubmit={(e) => { e.preventDefault(); submitBank(); }} noValidate autoComplete="off" className="space-y-5">
          {bankFailure && <div role="alert" className="rounded-xl border border-down px-3.5 py-3 text-[13px] text-down">{bankFailure}</div>}
          {(["bankName", "holderName", "iban", "password"] as const).map((k) => (
            <label key={k} className="block">
              <span className={labelClass}>{bt(`fields.${k}`)}</span>
              <input
                type={k === "password" ? "password" : "text"}
                autoComplete={k === "password" ? "current-password" : "off"}
                inputMode={k === "iban" ? "text" : undefined}
                placeholder={k === "iban" ? "AO06 0000 0000 0000 0000 0000 0" : undefined}
                value={bankForm[k]}
                onChange={(e) => setBankForm((b) => ({ ...b, [k]: k === "iban" ? formatIbanInput(e.target.value) : e.target.value }))}
                aria-invalid={!!bankErrors[k]}
                className={`${inputClass} mt-1.5 ${k === "iban" ? "mono-num" : ""} ${bankErrors[k] ? "!border-down" : ""}`}
              />
              {bankErrors[k] && <span role="alert" className="mt-1 block text-[12px] text-down">{bankErrors[k]}</span>}
            </label>
          ))}
          <p className="text-[12px] text-[var(--ink-500)]">{bt("securityNote")}</p>
          <div className="flex justify-end gap-3 border-t border-[var(--ink-100)] pt-5">
            <button type="button" onClick={closeBank} className="inline-flex h-10 items-center rounded-full border border-[var(--ink-200)] bg-white px-4 text-sm font-semibold">{t("modal.cancel")}</button>
            <button type="submit" disabled={bankPending} className={`${BRAND_BUTTON_CLASS} h-10 px-5 text-sm`}>{bankPending ? bt("saving") : bt("save")}</button>
          </div>
        </form>
      </Modal>

      <Section title={t("sales.title")} className="mt-8">
        {sales.length === 0 ? <EmptyState>{t("sales.empty")}</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse text-sm">
              <thead className="border-b border-[var(--ink-200)] bg-[var(--ink-50)]">
                <tr className="text-left">
                  <th className={`${th}`}>{t("sales.cols.date")}</th><th className={`${th}`}>{t("sales.cols.order")}</th>
                  <th className={`${th}`}>{t("sales.cols.product")}</th><th className={`${th}`}>{t("sales.cols.invoice")}</th>
                  <th className={`${th} text-right`}>{t("sales.cols.amount")}</th><th className={`${th}`}>{t("sales.cols.status")}</th>
                </tr>
              </thead>
              <tbody>
                {pager.slice.map((s) => (
                  <tr key={s.id} className="border-b border-[var(--ink-100)] transition-colors last:border-b-0 hover:bg-[var(--ink-50)]">
                    <td className="px-5 py-4 whitespace-nowrap text-[var(--ink-600)]">{dateOnly(s.createdAt, locale)}</td>
                    <td className="mono-num px-5 py-4 font-semibold">#{s.orderNumber}</td>
                    <td className="px-5 py-4"><span className="line-clamp-1 max-w-xs font-semibold">{s.productTitle}</span><span className="text-[12px] text-[var(--ink-500)]">{t("sales.qty", { count: s.quantity })}</span></td>
                    <td className="mono-num px-5 py-4 text-[var(--ink-600)]">{s.invoiceNumber ?? "—"}</td>
                    <td className="mono-num px-5 py-4 text-right font-bold">{f.money(s.money)}</td>
                    <td className="px-5 py-4"><Badge tone={s.state === "available" ? "success" : "warn"}>{t(`sales.status.${s.state}`)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager pager={pager} />
      </Section>

      <Section title={t("history.title")} className="mt-8">
        {withdrawals.length === 0 ? <EmptyState>{t("history.empty")}</EmptyState> : (
          <ul>
            {withdrawals.map((w) => ({ id: w.id, at: w.at, amount: w.amount, status: "pending" as const })).map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-4 border-b border-[var(--ink-100)] px-5 py-4 last:border-b-0 sm:px-6">
                <div><p className="mono-num font-semibold">{w.id}</p><p className="text-[12px] text-[var(--ink-500)]">{dateOnly(w.at, locale)}</p></div>
                <div className="flex items-center gap-4"><span className="mono-num font-bold">{f.money(w.amount)}</span><Badge tone="warn">{t("history.pending")}</Badge></div>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <p className="mt-6 text-center text-[12px] text-[var(--ink-500)]">{t("demoNote")}</p>

      <Modal open={open} onClose={close} title={t("modal.title")}>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
          <p className="text-sm text-[var(--ink-600)]">{t("modal.available", { amount: f.money(available) })}</p>
          <label className="block"><span className={labelClass}>{t("modal.amount")}</span>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" aria-invalid={amount !== "" && !valid} className={`${inputClass} mono-num mt-1.5`} />
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
