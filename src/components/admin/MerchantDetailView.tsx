"use client";

import { useLocale, useTranslations } from "next-intl";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { BoxIcon, CartIcon, ClockIcon, WalletIcon } from "@/components/kai/icons";
import { Link } from "@/i18n/navigation";
import type { MerchantDetail } from "@/shared/admin/types";
import { STATUS_TONE } from "./MerchantsView";
import { Badge, PageHeader, StatCard, card, dateOnly } from "./ui";

const PAYOUT_TONE = { paid: "success", pending: "warn", rejected: "danger" } as const;
const ORDER_TONE = { pending: "warn", processing: "warn", shipped: "brand", delivered: "success", cancelled: "neutral" } as const;

/** The 360° view of one store, read from the database (read-only: nothing here is a simulation). */
export function MerchantDetailView({ merchant: m }: { merchant: MerchantDetail }) {
  const t = useTranslations("Admin.detail");
  const orderT = useTranslations("Admin.orders");
  const status = useTranslations("Admin.merchants");
  const f = useFormatters();
  const locale = useLocale();

  return (
    <div>
      <Link href="/admin/lojistas" className="mb-4 inline-flex text-[13px] font-semibold text-[var(--ink-600)] hover:text-[var(--ink-900)]">← {t("back")}</Link>
      <PageHeader title={m.store} subtitle={`${m.owner} · ${m.email}`} actions={<Badge tone={STATUS_TONE[m.status]}>{status(`status.${m.status}`)}</Badge>} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard label={t("kpi.balance")} value={f.money(m.balance)} note={t("kpi.held", { amount: f.money(m.held) })} icon={<WalletIcon size={18} />} />
        <StatCard label={t("kpi.plan")} value={status(`plan.${m.plan}`)} note={t("kpi.since", { date: dateOnly(m.joinedAt, locale) })} icon={<BoxIcon size={18} />} />
        <StatCard label={t("kpi.pending")} value={String(m.pendingOrders)} note={t("kpi.total", { count: m.totalOrders })} icon={<ClockIcon size={18} />} tone={m.pendingOrders > 5 ? "warn" : "default"} />
        <StatCard label={t("kpi.gmv")} value={f.money(m.gmv)} icon={<CartIcon size={18} />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={`${card} overflow-hidden`}>
          <h2 className="border-b border-[var(--ink-200)] px-5 py-4 text-[17px] font-bold tracking-tight">{t("payouts.title")}</h2>
          {m.payouts.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-[var(--ink-600)]">{t("payouts.empty")}</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <tbody>
                {m.payouts.map((p) => (
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
          <h2 className="border-b border-[var(--ink-200)] px-5 py-4 text-[17px] font-bold tracking-tight">{t("products.listTitle")}</h2>
          {m.products.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-[var(--ink-600)]">{t("products.empty")}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {m.products.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-semibold text-[var(--ink-900)]">{p.name}</p>
                    <p className="text-[12px] text-[var(--ink-500)]">{p.supplierName}</p>
                  </div>
                  <span className="mono-num shrink-0 text-sm font-bold">{f.money(p.costPrice)}</span>
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
              {m.orders.map((o) => (
                <tr key={o.id} className="border-b border-gray-100 last:border-b-0">
                  <td className="mono-num px-5 py-3 font-semibold">#{o.number}</td>
                  <td className="px-2 py-3 text-[var(--ink-900)]"><span className="line-clamp-1 max-w-sm">{o.product}</span></td>
                  <td className="mono-num px-2 py-3 text-right font-bold">{f.money(o.total)}</td>
                  <td className="px-5 py-3 text-right"><Badge tone={ORDER_TONE[o.status]}>{orderT(`state.${o.status}`)}</Badge></td>
                </tr>
              ))}
              {m.orders.length === 0 && <tr><td className="px-5 py-10 text-center text-[var(--ink-600)]">{t("orders.empty")}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
