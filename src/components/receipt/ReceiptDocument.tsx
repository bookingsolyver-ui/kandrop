"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { Link } from "@/i18n/navigation";
import type { PublicReceipt } from "@/server/modules/receipts/schema";
import { KandropLogo } from "./KandropLogo";
import { PrintButton } from "./PrintButton";

/** Receipts are dated where the merchant and the buyer are, whatever the device's setting. */
const timeZone = "Africa/Luanda";

const LABEL = "text-[10px] font-medium tracking-[0.16em] text-ink-muted uppercase";

function Facts({ title, rows }: { title: string; rows: Array<[string, ReactNode]> }) {
  return (
    <section className="break-inside-avoid">
      <h2 className={`${LABEL} mb-3 border-b border-line pb-2`}>{title}</h2>
      <dl className="space-y-2 text-[13px]">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3">
            <dt className="text-ink-muted">{label}</dt>
            <dd className="font-medium break-words tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * The receipt, built to be read on screen and printed on A4 (`@media print` in globals.css hides
 * the toolbar, forces light colours and sets the page margins). Numbers use tabular figures.
 */
export function ReceiptDocument({
  receipt,
  backHref,
}: {
  receipt: PublicReceipt;
  backHref: string;
}) {
  const t = useTranslations("Receipt");
  const methods = useTranslations("Checkout.method");
  const f = useFormatters();
  const format = useFormatter();
  const date = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: "long", timeStyle: "short", timeZone });
  /** Compact form for the narrow facts column, where the long one would wrap. */
  const dateCompact = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short", timeZone });

  const { merchant, transaction } = receipt;
  const showReference = transaction.reference !== transaction.id;

  return (
    <div className="min-h-screen px-4 py-8 print:p-0">
      {/* Screen only: not part of the document. */}
      <div className="mx-auto mb-5 flex max-w-[210mm] items-start justify-between gap-4 print:hidden">
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center text-sm text-ink-2 underline underline-offset-4 hover:text-ink"
        >
          {t("back")}
        </Link>
        <PrintButton />
      </div>

      <article
        aria-labelledby="receipt-title"
        className="mx-auto max-w-[210mm] rounded-lg border border-line bg-surface p-6 sm:p-12 print:max-w-none print:rounded-none print:border-0 print:p-0"
      >
        <header className="flex items-start justify-between gap-6 border-b-2 border-ink pb-6">
          <KandropLogo descriptor={t("platform")} />
          <div className="text-right">
            <h1
              id="receipt-title"
              className="font-serif text-[1.75rem] leading-tight font-normal tracking-[-0.01em] sm:text-[2rem]"
            >
              {t("title")}
            </h1>
            <p className="mt-2 text-[13px] text-ink-2 tabular-nums">
              {t("number")} <span className="font-semibold text-ink">{receipt.number}</span>
            </p>
            <p className="text-[13px] text-ink-muted">
              {t("issuedOn", { date: date(receipt.issuedAt) })}
            </p>
          </div>
        </header>

        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <Facts
            title={t("merchant.title")}
            rows={[
              [t("merchant.name"), merchant.name],
              [
                t("merchant.nif"),
                merchant.nif ?? (
                  <span className="font-normal text-ink-muted">{t("merchant.nifEmpty")}</span>
                ),
              ],
              [t("merchant.country"), t("merchant.countryValue")],
            ]}
          />
          <Facts
            title={t("payment.title")}
            rows={[
              [t("payment.paidAt"), dateCompact(transaction.paidAt)],
              [t("payment.transactionId"), transaction.id],
              ...(showReference
                ? ([[t("payment.reference"), transaction.reference]] as Array<[string, ReactNode]>)
                : []),
              [t("payment.method"), methods(`${transaction.method}.name`)],
              [t("payment.paidWith"), transaction.target],
            ]}
          />
        </div>

        <section className="mt-10">
          <h2 className={`${LABEL} mb-3`}>{t("items.title")}</h2>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-ink text-left">
                <th scope="col" className={`${LABEL} py-2 pr-3`}>
                  {t("items.description")}
                </th>
                <th scope="col" className={`${LABEL} px-3 py-2 text-right`}>
                  {t("items.quantity")}
                </th>
                <th
                  scope="col"
                  className={`${LABEL} hidden px-3 py-2 text-right sm:table-cell print:table-cell`}
                >
                  {t("items.unitPrice")}
                </th>
                <th scope="col" className={`${LABEL} py-2 pl-3 text-right`}>
                  {t("items.total")}
                </th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((item, i) => (
                <tr key={i} className="break-inside-avoid border-b border-line">
                  <td className="py-3 pr-3 font-medium">{item.name}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{item.quantity}</td>
                  <td className="hidden px-3 py-3 text-right whitespace-nowrap tabular-nums sm:table-cell print:table-cell">
                    {f.money(item.unitAmount)}
                  </td>
                  <td className="py-3 pl-3 text-right font-medium whitespace-nowrap tabular-nums">
                    {f.money(item.unitAmount * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 grid items-end gap-6 sm:grid-cols-2 break-inside-avoid">
            <p className="flex items-center gap-2 text-sm font-medium">
              <svg
                aria-hidden
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-up"
              >
                <circle cx="8" cy="8" r="6.5" />
                <path d="m5 8.25 2 2L11 6" />
              </svg>
              {t("status.paid")}
            </p>

            <dl className="text-[13px]">
              <div className="flex justify-between gap-6 py-1 text-ink-2">
                <dt>{t("items.subtotal")}</dt>
                <dd className="tabular-nums">{f.money(receipt.subtotal)}</dd>
              </div>
              {receipt.kind !== "subscription" && (
                <div className="flex justify-between gap-6 py-1 text-ink-2">
                  <dt>{t("items.shipping")}</dt>
                  <dd className="tabular-nums">
                    {receipt.shippingAmount === 0
                      ? t("items.free")
                      : f.money(receipt.shippingAmount)}
                  </dd>
                </div>
              )}
              <div className="mt-2 flex items-baseline justify-between gap-6 border-t-2 border-ink pt-3">
                <dt className="font-semibold">{t("items.totalPaid")}</dt>
                <dd className="font-serif text-[1.75rem] leading-none tabular-nums">
                  {f.money(receipt.total)}
                </dd>
              </div>
            </dl>
          </div>
          <p className="mt-2 text-right text-[11px] text-ink-muted">{t("currencyNote")}</p>
        </section>

        <footer className="mt-12 break-inside-avoid border-t border-line pt-5">
          <p className="text-[11px] leading-relaxed text-ink-muted">{t("legal")}</p>
          <p className="mt-3 flex flex-wrap justify-between gap-x-6 gap-y-1 text-[11px] text-ink-muted tabular-nums">
            <span>
              Kandrop · {t("number")} {receipt.number}
            </span>
            <span>{t("generated", { date: date(receipt.issuedAt) })}</span>
          </p>
        </footer>
      </article>
    </div>
  );
}
