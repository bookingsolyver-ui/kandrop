"use client";

import { useLocale, useTranslations } from "next-intl";
import { Badge, dateTime } from "@/components/admin/ui";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { LOGISTICS_STATUSES, type LogisticsStatus } from "@/shared/fulfilment/schemas";
import type { SupplierOrderRow } from "./types";
import { EmptyState, Section, SupplierPageHeader, th } from "./ui";

const TONE: Record<LogisticsStatus, "warn" | "brand" | "success"> = { pending: "warn", preparing: "brand", picked_up: "brand", in_transit: "brand", delivered: "success" };

function Table({ rows, showWhen }: { rows: SupplierOrderRow[]; showWhen: boolean }) {
  const t = useTranslations("Supplier.orders");
  const f = useFormatters();
  const locale = useLocale();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] border-collapse text-sm">
        <thead className="border-b border-[var(--ink-200)] bg-[var(--ink-50)]">
          <tr className="text-left">
            <th className={th}>{t("cols.order")}</th><th className={th}>{t("cols.product")}</th>
            <th className={`${th} text-right`}>{t("cols.qty")}</th><th className={`${th} text-right`}>{t("cols.due")}</th>
            <th className={th}>{t("cols.status")}</th>{showWhen && <th className={th}>{t("cols.date")}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="border-b border-[var(--ink-100)] last:border-b-0 hover:bg-[var(--ink-50)]">
              <td className="mono-num px-5 py-4 font-semibold">#{o.orderNumber}{o.invoiceNumber && <span className="block text-[12px] font-normal text-[var(--ink-500)]">{o.invoiceNumber}</span>}</td>
              <td className="px-5 py-4"><span className="line-clamp-2 max-w-sm font-semibold">{o.productTitle}</span></td>
              <td className="mono-num px-5 py-4 text-right font-extrabold">{o.quantity}</td>
              <td className="mono-num px-5 py-4 text-right font-bold">{f.money(o.costTotal)}</td>
              <td className="px-5 py-4"><Badge tone={TONE[o.status]}>{t(`status.${o.status}`)}</Badge></td>
              {showWhen && <td className="px-5 py-4 whitespace-nowrap text-[var(--ink-600)]">{dateTime(o.createdAt, locale)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** What was sold: first what has to be prepared for Kandrop to collect, then everything on its way or done. */
export function SupplierOrders({ orders }: { orders: SupplierOrderRow[] }) {
  const t = useTranslations("Supplier.orders");
  const todo = orders.filter((o) => o.status === "pending" || o.status === "preparing");
  const rest = orders.filter((o) => !todo.includes(o));
  return (
    <div>
      <SupplierPageHeader title={t("title")} subtitle={t("subtitle")} />
      <Section title={t("prepare.title")}>
        <p className="border-b border-[var(--ink-100)] px-5 py-3.5 text-[13px] leading-relaxed text-[var(--ink-600)] sm:px-6">{t("prepare.help")}</p>
        {todo.length === 0 ? <EmptyState>{t("prepare.empty")}</EmptyState> : <Table rows={todo} showWhen />}
      </Section>
      <Section title={t("history.title")} className="mt-8">
        {rest.length === 0 ? <EmptyState>{t("history.empty")}</EmptyState> : <Table rows={rest} showWhen />}
      </Section>
      <ol className="mt-8 grid gap-3 text-[13px] text-[var(--ink-600)] sm:grid-cols-5">
        {LOGISTICS_STATUSES.map((s, i) => (
          <li key={s} className="rounded-xl border border-[var(--ink-200)] bg-white px-3.5 py-3"><span className="mono-num mr-1.5 font-bold text-[var(--ink-900)]">{i + 1}.</span>{t(`status.${s}`)}</li>
        ))}
      </ol>
    </div>
  );
}
