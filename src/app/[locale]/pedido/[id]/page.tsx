import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { OrderPlacedView } from "@/components/storefront/OrderPlacedView";
import { routing } from "@/i18n/routing";
import { getShopperOrder } from "@/server/modules/fulfilment/service";
import { orderPaymentInfo } from "@/server/modules/payments/transfer";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "OrderPlaced" });
  return { title: `${t("title")} — Kandrop`, robots: { index: false, follow: false } };
}

/** The page the shopper lands on after "Buy now": the order, how to pay Kandrop and where to send the slip. */
export default async function OrderPlacedPage({ params }: Props) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const order = await getShopperOrder(id);
  if (!order) notFound();
  // Kandrop's REAL details only, each shown only when set and valid (no sandbox example ever reaches a shopper).
  const pay = orderPaymentInfo();
  return <OrderPlacedView order={order} pay={pay} orderId={id} trackPurchase={order.justPlaced} />;
}
