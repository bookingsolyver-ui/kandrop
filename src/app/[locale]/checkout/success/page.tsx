import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { SuccessView } from "@/components/checkout/SuccessView";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getEnv } from "@/server/config/env";
import { getPublicCheckout } from "@/server/modules/checkout/service";
import { getPayment } from "@/server/modules/payments/service";

// Depends on live payment state: never prerender.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ payment?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Checkout.success" });
  // A receipt must never be indexed or shared through search results.
  return { title: `${t("title")} — Kandrop`, robots: { index: false, follow: false } };
}

/**
 * The receipt, reached as `/checkout/success?payment=<id>` once the payment is confirmed. The id
 * is unguessable (the same capability the buyer already uses to poll it), and the page shows
 * only what the buyer just paid: masked phone/card, never full card data.
 */
export default async function CheckoutSuccessPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const { payment: id } = await searchParams;
  const payment = id ? getPayment(id) : null;
  if (!payment) notFound();

  // Not paid (yet, or at all): this page would be a lie, so send the buyer back to the payment.
  if (payment.status !== "success") {
    redirect({ href: { pathname: "/checkout", query: { session: payment.sessionId } }, locale });
  }

  const checkout = getPublicCheckout(payment.sessionId);
  if (!checkout) notFound();

  return (
    <SuccessView
      payment={payment}
      checkout={checkout}
      sandbox={getEnv().PAYMENTS_MODE === "sandbox"}
    />
  );
}
