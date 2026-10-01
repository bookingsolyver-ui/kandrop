"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { useToast } from "@/components/ui/Toast";
import { ADJUSTMENTS_SEED, MERCHANTS, REFUSED, merchantById, type AdjustmentKind, type ManualAdjustment } from "@/shared/admin/mock";
import { Badge, PageHeader, card, dateOnly } from "./ui";

/** Refused deliveries and manual adjustments: who pays for a failed attempt, or Kandrop takes the loss. */
export function RefundsView() {
  const t = useTranslations("Admin.refunds");
  const f = useFormatters();
  const locale = useLocale();
  const toast = useToast();
  const form = useRef<HTMLFormElement>(null);
  const [log, setLog] = useState<ManualAdjustment[]>(ADJUSTMENTS_SEED);
  const [kind, setKind] = useState<AdjustmentKind>("debit_merchant");
  const [merchantId, setMerchantId] = useState(MERCHANTS[0]!.id);
  const [orderNumber, setOrderNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [decided, setDecided] = useState<Record<string, AdjustmentKind>>({});

  const kz = Number(amount.replace(/\s/g, "").replace(",", "."));
  const valid = Number.isFinite(kz) && kz > 0 && kz <= 10_000_000 && reason.trim().length >= 10;

  const prefill = (r: (typeof REFUSED)[number], k: AdjustmentKind) => {
    setKind(k);
    setMerchantId(r.merchantId);
    setOrderNumber(String(r.number));
    setAmount(String(Math.round(r.attemptCost / 100)));
    setReason(t(k === "debit_merchant" ? "prefill.debit" : "prefill.absorb"));
    form.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const submit = () => {
    if (!valid) return;
    const entry: ManualAdjustment = {
      id: `ADJ-${String(22 + log.length - ADJUSTMENTS_SEED.length).padStart(3, "0")}`,
      at: Date.now(),
      kind,
      merchantId,
      orderNumber: orderNumber ? Number(orderNumber) : undefined,
      amount: Math.round(kz * 100),
      reason: reason.trim(),
    };
    setLog((l) => [entry, ...l]);
    if (entry.orderNumber) {
      const refused = REFUSED.find((r) => r.number === entry.orderNumber);
      if (refused) setDecided((d) => ({ ...d, [refused.orderId]: kind }));
    }
    toast({ message: t(kind === "debit_merchant" ? "toast.debited" : "toast.absorbed") });
    setAmount(""); setReason(""); setOrderNumber("");
  };

  const field = "h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20";
  const label = "text-xs font-semibold tracking-wide text-[var(--ink-700)] uppercase";

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <section className={`${card} overflow-hidden`} aria-labelledby="refused-title">
        <div className="border-b border-[var(--ink-200)] px-5 py-4">
          <h2 id="refused-title" className="text-[17px] font-bold tracking-tight">{t("refused.title")}</h2>
          <p className="mt-1 text-[13px] text-[var(--ink-600)]">{t("refused.body")}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[60rem] border-collapse text-sm">
            <thead className="border-b border-gray-100 bg-[var(--ink-50)]">
              <tr className="text-left text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase">
                <th className="px-4 py-3">{t("refused.cols.order")}</th>
                <th className="px-4 py-3">{t("refused.cols.product")}</th>
                <th className="px-4 py-3 text-right">{t("refused.cols.attempt")}</th>
                <th className="px-4 py-3 text-right">{t("refused.cols.held")}</th>
                <th className="px-4 py-3">{t("refused.cols.decision")}</th>
              </tr>
            </thead>
            <tbody>
              {REFUSED.map((r) => (
                <tr key={r.orderId} className="border-b border-gray-100 align-top last:border-b-0 hover:bg-[var(--ink-50)]">
                  <td className="px-4 py-3 whitespace-nowrap"><p className="mono-num font-bold">#{r.number}</p><p className="text-[12px] text-[var(--ink-500)]">{dateOnly(r.at, locale)}</p></td>
                  <td className="px-4 py-3"><p className="line-clamp-2 max-w-sm font-semibold">{r.product}</p><p className="text-[12px] text-[var(--ink-500)]">{merchantById(r.merchantId)?.store}</p></td>
                  <td className="mono-num px-4 py-3 text-right font-bold text-[var(--kai-orange-600)]">{f.money(r.attemptCost)}</td>
                  <td className="mono-num px-4 py-3 text-right text-[var(--ink-600)]">{f.money(r.productCost)}</td>
                  <td className="px-4 py-3">
                    {decided[r.orderId] ? (
                      <Badge tone={decided[r.orderId] === "debit_merchant" ? "brand" : "neutral"}>{t(decided[r.orderId] === "debit_merchant" ? "decided.debit" : "decided.absorb")}</Badge>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => prefill(r, "debit_merchant")} className="h-9 rounded-full bg-brand-orange px-3.5 text-[12px] font-bold whitespace-nowrap text-brand-black">{t("actions.debit")}</button>
                        <button type="button" onClick={() => prefill(r, "absorb_loss")} className="h-9 rounded-full border border-[var(--ink-200)] bg-white px-3.5 text-[12px] font-semibold whitespace-nowrap">{t("actions.absorb")}</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,26rem)_1fr]">
        <section className={`${card} p-5`} aria-labelledby="form-title">
          <h2 id="form-title" className="text-[17px] font-bold tracking-tight">{t("form.title")}</h2>
          <form ref={form} onSubmit={(e) => { e.preventDefault(); submit(); }} className="mt-4 space-y-4">
            <fieldset>
              <legend className={label}>{t("form.type")}</legend>
              <div className="mt-1.5 grid gap-2">
                {(["debit_merchant", "absorb_loss"] as const).map((k) => (
                  <label key={k} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${kind === k ? "border-brand-orange bg-[var(--kai-orange-50)]" : "border-[var(--ink-200)] bg-white"}`}>
                    <input type="radio" name="kind" checked={kind === k} onChange={() => setKind(k)} className="mt-1 accent-brand-orange" />
                    <span><span className="block text-sm font-semibold">{t(`form.kind.${k}`)}</span><span className="block text-[12px] text-[var(--ink-600)]">{t(`form.kindHelp.${k}`)}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block"><span className={label}>{t("form.merchant")}</span>
              <select value={merchantId} onChange={(e) => setMerchantId(e.target.value)} className={`${field} mt-1.5`}>
                {MERCHANTS.map((m) => <option key={m.id} value={m.id}>{m.store}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className={label}>{t("form.order")}</span><input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} inputMode="numeric" placeholder="#2013" className={`${field} mono-num mt-1.5`} /></label>
              <label className="block"><span className={label}>{t("form.amount")}</span><input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className={`${field} mono-num mt-1.5`} aria-invalid={amount !== "" && !(kz > 0)} /></label>
            </div>
            <label className="block"><span className={label}>{t("form.reason")}</span>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-border bg-white p-3 text-sm outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20" />
              <span className="mt-1 block text-[12px] text-[var(--ink-500)]">{t("form.reasonHelp")}</span>
            </label>
            <button type="submit" disabled={!valid} className="inline-flex h-11 w-full items-center justify-center rounded-full bg-brand-orange text-sm font-bold text-brand-black disabled:opacity-50">
              {t(kind === "debit_merchant" ? "form.submitDebit" : "form.submitAbsorb")}
            </button>
          </form>
        </section>

        <section className={`${card} overflow-hidden`} aria-labelledby="log-title">
          <h2 id="log-title" className="border-b border-[var(--ink-200)] px-5 py-4 text-[17px] font-bold tracking-tight">{t("log.title")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <tbody>
                {log.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100 align-top last:border-b-0">
                    <td className="px-5 py-3 whitespace-nowrap"><p className="mono-num font-semibold">{a.id}</p><p className="text-[12px] text-[var(--ink-500)]">{dateOnly(a.at, locale)}</p></td>
                    <td className="px-2 py-3"><Badge tone={a.kind === "debit_merchant" ? "brand" : "neutral"}>{t(`form.kind.${a.kind}`)}</Badge></td>
                    <td className="px-2 py-3"><p className="font-semibold">{merchantById(a.merchantId)?.store}{a.orderNumber ? ` · #${a.orderNumber}` : ""}</p><p className="text-[12px] text-[var(--ink-600)]">{a.reason}</p></td>
                    <td className={`mono-num px-5 py-3 text-right font-bold ${a.kind === "debit_merchant" ? "text-[var(--kai-success)]" : "text-down"}`}>{a.kind === "debit_merchant" ? "+" : "−"}{f.money(a.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-[var(--ink-200)] px-5 py-3 text-[12px] text-[var(--ink-500)]">{t("log.legend")}</p>
        </section>
      </div>
      <p className="mt-4 text-center text-[12px] text-[var(--ink-500)]">{t("demoNote")}</p>
    </div>
  );
}
