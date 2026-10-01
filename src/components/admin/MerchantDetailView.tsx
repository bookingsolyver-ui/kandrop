"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { BoxIcon, CartIcon, ClockIcon, WalletIcon } from "@/components/kai/icons";
import { useToast } from "@/components/ui/Toast";
import { Link } from "@/i18n/navigation";
import { ADMIN_ORDERS, merchantById, type Merchant, type MerchantStatus } from "@/shared/admin/mock";
import { findVitrineProduct } from "@/shared/vitrine/mock";
import { STATUS_TONE } from "./MerchantsView";
import { Badge, Modal, PageHeader, StatCard, card, dateOnly } from "./ui";

interface Adjustment {
  id: number;
  at: number;
  amount: number;
  reason: string;
}

const PAYOUT_TONE = { paid: "success", pending: "warn", rejected: "danger" } as const;
const ORDER_TONE = { pending: "warn", processing: "warn", shipped: "brand", delivered: "success", returned: "danger", cancelled: "neutral" } as const;

/** The 360° view of one store. The three critical actions work in memory only (a simulation). */
export function MerchantDetailView({ merchantId }: { merchantId: string }) {
  const t = useTranslations("Admin.detail");
  const orderT = useTranslations("Admin.orders");
  const status = useTranslations("Admin.merchants");
  const f = useFormatters();
  const locale = useLocale();
  const toast = useToast();
  const base = merchantById(merchantId) as Merchant;

  const [balance, setBalance] = useState(base.balance);
  const [state, setState] = useState<MerchantStatus>(base.status);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [dialog, setDialog] = useState<null | "products" | "adjust" | "suspend">(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");

  const kz = Number(amount.replace(/\s/g, "").replace(",", "."));
  const amountOk = Number.isFinite(kz) && kz !== 0 && Math.abs(kz) <= 10_000_000;
  const reasonOk = reason.trim().length >= 10;
  const newBalance = balance + (amountOk ? Math.round(kz * 100) : 0);
  const overdraw = amountOk && newBalance < 0;
  const orders = ADMIN_ORDERS.filter((o) => o.merchantId === base.id);
  const products = base.productIds.map((id) => findVitrineProduct(id)).filter((p): p is NonNullable<typeof p> => !!p);
  const close = () => { setDialog(null); setAmount(""); setReason(""); setSuspendReason(""); };

  const applyAdjustment = () => {
    if (!amountOk || !reasonOk || overdraw) return;
    setBalance(newBalance);
    setAdjustments((list) => [{ id: list.length + 1, at: Date.now(), amount: Math.round(kz * 100), reason: reason.trim() }, ...list]);
    toast({ message: t("toast.adjusted") });
    close();
  };
  const toggleSuspension = () => {
    const suspending = state !== "suspended";
    setState(suspending ? "suspended" : "active");
    toast({ message: t(suspending ? "toast.suspended" : "toast.reactivated") });
    close();
  };

  const input = "h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20";
  const outline = "inline-flex h-10 items-center rounded-full border border-[var(--ink-200)] bg-white px-4 text-sm font-semibold text-[var(--ink-900)] transition-colors hover:border-[var(--ink-300)]";

  return (
    <div>
      <Link href="/admin/lojistas" className="mb-4 inline-flex text-[13px] font-semibold text-[var(--ink-600)] hover:text-[var(--ink-900)]">← {t("back")}</Link>
      <PageHeader
        title={base.store}
        subtitle={`${base.owner} · ${base.email} · ${base.phone} · ${base.city}`}
        actions={
          <>
            <Badge tone={STATUS_TONE[state]}>{status(`status.${state}`)}</Badge>
            <button type="button" onClick={() => setDialog("products")} className={outline}>{t("actions.products")}</button>
            <button type="button" onClick={() => setDialog("adjust")} className={outline}>{t("actions.adjust")}</button>
            <button type="button" onClick={() => setDialog("suspend")}
              className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-bold ${state === "suspended" ? "bg-brand-orange text-brand-black" : "border border-[var(--kai-danger)] bg-white text-[var(--kai-danger)] hover:bg-[var(--kai-danger-bg)]"}`}>
              {t(state === "suspended" ? "actions.reactivate" : "actions.suspend")}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard label={t("kpi.balance")} value={f.money(balance)} note={t("kpi.held", { amount: f.money(base.held) })} icon={<WalletIcon size={18} />} />
        <StatCard label={t("kpi.plan")} value={status(`plan.${base.plan}`)} note={t("kpi.since", { date: dateOnly(base.joinedAt, locale) })} icon={<BoxIcon size={18} />} />
        <StatCard label={t("kpi.pending")} value={String(base.pendingOrders)} note={t("kpi.total", { count: base.totalOrders })} icon={<ClockIcon size={18} />} tone={base.pendingOrders > 5 ? "warn" : "default"} />
        <StatCard label={t("kpi.gmv")} value={f.money(base.gmv)} icon={<CartIcon size={18} />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={`${card} overflow-hidden`}>
          <h2 className="border-b border-[var(--ink-200)] px-5 py-4 text-[17px] font-bold tracking-tight">{t("payouts.title")}</h2>
          {base.payouts.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-[var(--ink-600)]">{t("payouts.empty")}</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <tbody>
                {base.payouts.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-5 py-3 text-[var(--ink-600)]">{dateOnly(p.date, locale)}</td>
                    <td className="px-2 py-3 text-[var(--ink-500)]">{p.bank}</td>
                    <td className="mono-num px-2 py-3 text-right font-bold">{f.money(p.amount)}</td>
                    <td className="px-5 py-3 text-right"><Badge tone={PAYOUT_TONE[p.status]}>{t(`payouts.status.${p.status}`)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className={`${card} overflow-hidden`}>
          <h2 className="border-b border-[var(--ink-200)] px-5 py-4 text-[17px] font-bold tracking-tight">{t("adjustments.title")}</h2>
          {adjustments.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-[var(--ink-600)]">{t("adjustments.empty")}</p>
          ) : (
            <ul>
              {adjustments.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-3 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-[var(--ink-900)]">{a.reason}</p>
                    <p className="text-[12px] text-[var(--ink-500)]">{dateOnly(a.at, locale)}</p>
                  </div>
                  <span className={`mono-num font-bold ${a.amount > 0 ? "text-[var(--kai-success)]" : "text-[var(--kai-danger)]"}`}>{a.amount > 0 ? "+" : ""}{f.money(a.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className={`${card} mt-6 overflow-hidden`}>
        <h2 className="border-b border-[var(--ink-200)] px-5 py-4 text-[17px] font-bold tracking-tight">{t("orders.title")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <tbody>
              {orders.slice(0, 6).map((o) => (
                <tr key={o.id} className="border-b border-gray-100 last:border-b-0">
                  <td className="mono-num px-5 py-3 font-semibold">#{o.number}</td>
                  <td className="px-2 py-3 text-[var(--ink-900)]"><span className="line-clamp-1 max-w-sm">{o.product}</span></td>
                  <td className="mono-num px-2 py-3 text-right font-bold">{f.money(o.total)}</td>
                  <td className="px-5 py-3 text-right"><Badge tone={ORDER_TONE[o.state]}>{orderT(`state.${o.state}`)}</Badge></td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td className="px-5 py-10 text-center text-[var(--ink-600)]">{t("orders.empty")}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-4 text-center text-[12px] text-[var(--ink-500)]">{t("demoNote")}</p>

      <Modal open={dialog === "products"} onClose={close} title={t("products.title", { store: base.store })}>
        {products.length === 0 ? <p className="text-sm text-[var(--ink-600)]">{t("products.empty")}</p> : (
          <ul className="divide-y divide-gray-100">
            {products.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-semibold text-[var(--ink-900)]">{p.title}</p>
                  <p className="text-[12px] text-[var(--ink-500)]">{p.sku} · {p.kind === "nacional" ? status("origin.nacional") : status("origin.internacional")}</p>
                </div>
                <span className="mono-num shrink-0 text-sm font-bold">{f.money(p.costPrice)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5 flex justify-end"><button type="button" onClick={close} className={outline}>{t("close")}</button></div>
      </Modal>

      <Modal open={dialog === "adjust"} onClose={close} title={t("adjust.title")}>
        <form onSubmit={(e) => { e.preventDefault(); applyAdjustment(); }} className="space-y-4">
          <p className="text-sm text-[var(--ink-600)]">{t("adjust.current", { amount: f.money(balance) })}</p>
          <label className="block">
            <span className="text-xs font-semibold tracking-wide text-[var(--ink-700)] uppercase">{t("adjust.amount")}</span>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="+25000 / -10000" className={`${input} mono-num mt-1.5`} aria-invalid={amount !== "" && !amountOk} />
            <span className="mt-1 block text-[12px] text-[var(--ink-500)]">{t("adjust.amountHelp")}</span>
          </label>
          <label className="block">
            <span className="text-xs font-semibold tracking-wide text-[var(--ink-700)] uppercase">{t("adjust.reason")}</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-border bg-white p-3 text-sm outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20" />
            <span className="mt-1 block text-[12px] text-[var(--ink-500)]">{t("adjust.reasonHelp")}</span>
          </label>
          {amountOk && <p className={`text-sm font-semibold ${overdraw ? "text-down" : "text-[var(--ink-900)]"}`}>{overdraw ? t("adjust.overdraw") : t("adjust.after", { amount: f.money(newBalance) })}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={close} className={outline}>{t("cancel")}</button>
            <button type="submit" disabled={!amountOk || !reasonOk || overdraw} className="inline-flex h-10 items-center rounded-full bg-brand-orange px-5 text-sm font-bold text-brand-black disabled:opacity-50">{t("adjust.apply")}</button>
          </div>
        </form>
      </Modal>

      <Modal open={dialog === "suspend"} onClose={close} title={t(state === "suspended" ? "reactivate.title" : "suspend.title")}>
        <p className="text-sm text-[var(--ink-600)]">{t(state === "suspended" ? "reactivate.body" : "suspend.body", { store: base.store })}</p>
        {state !== "suspended" && (
          <label className="mt-4 block">
            <span className="text-xs font-semibold tracking-wide text-[var(--ink-700)] uppercase">{t("suspend.reason")}</span>
            <textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-border bg-white p-3 text-sm outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20" />
          </label>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={close} className={outline}>{t("cancel")}</button>
          <button type="button" onClick={toggleSuspension} disabled={state !== "suspended" && suspendReason.trim().length < 10}
            className={`inline-flex h-10 items-center rounded-full px-5 text-sm font-bold disabled:opacity-50 ${state === "suspended" ? "bg-brand-orange text-brand-black" : "bg-[var(--kai-danger)] text-white"}`}>
            {t(state === "suspended" ? "reactivate.confirm" : "suspend.confirm")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
