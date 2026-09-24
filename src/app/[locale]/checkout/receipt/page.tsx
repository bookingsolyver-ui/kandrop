import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ReceiptDocument } from "@/components/receipt/ReceiptDocument";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getPayment } from "@/server/modules/payments/service";
import { getReceipt } from "@/server/modules/receipts/service";

// Depends on live payment state: never prerender.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ payment?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const { payment } = await searchParams;
  const t = await getTranslations({ locale, namespace: "Receipt" });
  const receipt = payment ? getReceipt(payment) : null;
  // The title becomes the suggested file name when the buyer chooses "Save as PDF".
  return {
    title: `${t("title")}${receipt ? ` ${receipt.number}` : ""} — Kandrop`,
    // A receipt must never be indexed or shared through search results.
    robots: { index: false, follow: false },
  };
}

/**
 * The receipt of a confirmed payment, as `/checkout/receipt?payment=<id>`. Like the success page
 * it is reached with the unguessable payment id, and it only shows what was paid: masked phone
 * or card, never full card data.
 */
export default async function ReceiptPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const { payment: id } = await searchParams;
  const receipt = id ? getReceipt(id) : null;
  if (!receipt) {
    // Known but not paid (yet): there is no receipt to show, so go back to the payment.
    const payment = id ? getPayment(id) : null;
    if (payment) {
      redirect({ href: { pathname: "/checkout", query: { session: payment.sessionId } }, locale });
    }
    notFound();
  }

  return (
    <ReceiptDocument
      receipt={receipt}
      backHref={`/checkout/success?payment=${encodeURIComponent(receipt.paymentId)}`}
    />
  );
}
