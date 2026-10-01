import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { cache } from "react";
import { redirect } from "@/i18n/navigation";
import { CheckoutView } from "@/components/storefront/CheckoutView";
import { routing } from "@/i18n/routing";
import { ApiError } from "@/server/http/errors";
import { deliveryOptions, toIsoDay, luandaToday } from "@/shared/fulfilment/deliveryDate";
import { getStorefrontProduct } from "@/server/modules/storefront/service";

// Price, stock and the offer depend on the clock: never prerender.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<{ error?: string }> };

const load = cache(async (slug: string) => {
  try {
    return await getStorefrontProduct(slug);
  } catch (error) {
    if (error instanceof ApiError && error.code === "not_found") notFound();
    throw error;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const [p, t] = await Promise.all([load(slug), getTranslations({ locale, namespace: "QuickCheckout" })]);
  return { title: `${t("title")} — ${p.title}`, robots: { index: false, follow: false } };
}

/** Direct checkout of one product: who receives it, where, and how it is paid, in one calm page. */
export default async function QuickCheckoutPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const product = await load(slug);
  // Nothing left: back to the product page, which says so.
  if (product.stock.state === "out") return redirect({ href: `/loja/${slug}`, locale });
  const invalid = (await searchParams).error === "details";
  // The four delivery days are worked out on the server (Luanda time), so the page and the check agree.
  const now = Date.now();
  return <CheckoutView product={product} invalid={invalid} days={deliveryOptions(now)} today={toIsoDay(luandaToday(now))} />;
}
