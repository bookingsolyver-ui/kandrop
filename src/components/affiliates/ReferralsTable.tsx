"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useFormatters } from "@/components/dashboard/useFormatters";
import type { PublicReferral } from "@/server/modules/affiliates/schema";
import { PaymentBadge } from "./PaymentBadge";

const TH = "text-left text-[11px] font-medium tracking-[0.14em] text-ink-muted uppercase";

/**
 * One line per referred person: masked e-mail, when they signed up, their plan, whether they
 * are paying, and what that brings each month. From `sm` up the date and plan get columns of
 * their own; on a phone they sit under the e-mail so the row still fits without scrolling.
 */
export function ReferralsTable({ items }: { items: PublicReferral[] }) {
  const t = useTranslations("Affiliates");
  const format = useFormatter();
  const f = useFormatters();
  const day = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium" });

  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">{t("table.caption")}</caption>
      <thead>
        <tr className="border-b border-line">
          <th scope="col" className={`${TH} py-3`}>
            {t("table.email")}
          </th>
          <th scope="col" className={`${TH} hidden py-3 pl-4 sm:table-cell`}>
            {t("table.registered")}
          </th>
          <th scope="col" className={`${TH} hidden py-3 pl-4 sm:table-cell`}>
            {t("table.plan")}
          </th>
          <th scope="col" className={`${TH} py-3 pl-4`}>
            {t("table.payment")}
          </th>
          <th scope="col" className={`${TH} hidden py-3 pl-4 text-right md:table-cell`}>
            {t("table.commission")}
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((r) => (
          <tr key={r.id} className="border-b border-line last:border-0">
            <td className="py-3.5">
              <p className="font-medium">{r.email}</p>
              <p className="mt-0.5 text-[13px] text-ink-muted sm:hidden">
                {t(`plans.${r.plan}`)} · {day(r.registeredAt)}
              </p>
            </td>
            <td className="hidden py-3.5 pl-4 whitespace-nowrap text-ink-2 sm:table-cell">
              {day(r.registeredAt)}
            </td>
            <td className="hidden py-3.5 pl-4 sm:table-cell">{t(`plans.${r.plan}`)}</td>
            <td className="py-3.5 pl-4">
              <PaymentBadge state={r.payment} />
            </td>
            <td className="hidden py-3.5 pl-4 text-right whitespace-nowrap tabular-nums md:table-cell">
              {r.monthlyCommission > 0 ? (
                <span className="text-up">{f.money(r.monthlyCommission)}</span>
              ) : (
                <span className="text-ink-muted">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
