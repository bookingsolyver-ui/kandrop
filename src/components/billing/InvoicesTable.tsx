"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { ListMessage } from "@/components/data/ListStates";
import { Link } from "@/i18n/navigation";
import type { PublicInvoice } from "@/server/modules/billing/schema";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";

const TH = "text-left text-[11px] font-medium tracking-[0.14em] text-ink-muted uppercase";

/**
 * Every payment of the subscription. "Download PDF" opens the print-ready receipt page (the
 * browser's "Save as PDF" makes the file): there is no PDF generator on the server yet, and the
 * note under the table says what the document is — a receipt, not a tax invoice.
 */
export function InvoicesTable({ invoices }: { invoices: PublicInvoice[] }) {
  const t = useTranslations("Billing.invoices");
  const names = useTranslations("Shell.plan.names");
  const f = useFormatters();
  const format = useFormatter();
  const day = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium" });

  return (
    <section
      aria-labelledby="invoices-title"
      className="rounded-lg border border-line bg-surface px-4 py-2 sm:px-6 sm:py-3"
    >
      <header className="pt-4 pb-2">
        <h2
          id="invoices-title"
          className="font-serif text-[1.375rem] leading-tight font-medium tracking-tight"
        >
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">{t("subtitle")}</p>
      </header>

      {invoices.length === 0 ? (
        <ListMessage title={t("empty.title")} body={t("empty.body")} />
      ) : (
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{t("caption")}</caption>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className={`${TH} hidden py-3 md:table-cell`}>
                {t("number")}
              </th>
              <th scope="col" className={`${TH} py-3 md:pl-4`}>
                {t("date")}
              </th>
              <th scope="col" className={`${TH} hidden py-3 pl-4 sm:table-cell`}>
                {t("plan")}
              </th>
              <th scope="col" className={`${TH} py-3 pl-4 text-right`}>
                {t("amount")}
              </th>
              <th scope="col" className={`${TH} py-3 pl-4`}>
                {t("status")}
              </th>
              <th scope="col" className={`${TH} py-3 pl-4 text-right`}>
                <span className="sr-only sm:not-sr-only">{t("document")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-b border-line last:border-0">
                <td className="hidden py-3.5 font-medium whitespace-nowrap tabular-nums md:table-cell">
                  {invoice.number ?? t("none")}
                </td>
                <td className="py-3.5 whitespace-nowrap md:pl-4">
                  {day(invoice.date)}
                  <span className="mt-0.5 block text-[13px] text-ink-muted sm:hidden">
                    {names(invoice.plan)}
                  </span>
                </td>
                <td className="hidden py-3.5 pl-4 sm:table-cell">{names(invoice.plan)}</td>
                <td className="py-3.5 pl-4 text-right font-medium whitespace-nowrap tabular-nums">
                  {f.money(invoice.amount)}
                </td>
                <td className="py-3.5 pl-4">
                  <InvoiceStatusBadge status={invoice.status} />
                </td>
                <td className="py-3.5 pl-4 text-right">
                  {invoice.paymentId ? (
                    <Link
                      href={{
                        pathname: "/checkout/receipt",
                        query: { payment: invoice.paymentId },
                      }}
                      target="_blank"
                      aria-label={t("pdfLabel", { number: invoice.number ?? "" })}
                      className="inline-flex min-h-11 items-center rounded px-1 text-[13px] text-accent underline underline-offset-4 hover:opacity-80"
                    >
                      <span className="sm:hidden">{t("pdfShort")}</span>
                      <span className="hidden sm:inline">{t("pdf")}</span>
                    </Link>
                  ) : (
                    <span className="text-ink-muted">{t("none")}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="border-t border-line py-4 text-[13px] leading-relaxed text-ink-muted">
        {t("note")}
      </p>
    </section>
  );
}
