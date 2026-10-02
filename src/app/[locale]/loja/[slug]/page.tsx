import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { cache } from "react";
import { StorePixel } from "@/components/analytics/StorePixel";
import { StorefrontView } from "@/components/storefront/StorefrontView";
import { routing } from "@/i18n/routing";
import { getEnv } from "@/server/config/env";
import { ApiError } from "@/server/http/errors";
import { orderPaymentInfo } from "@/server/modules/payments/transfer";
import { getStorefrontProduct } from "@/server/modules/storefront/service";

// Price, stock and the offer depend on the clock: never prerender.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; slug: string }> };

/** One lookup per request, shared by the metadata and the page. Missing or inactive → 404. */
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
  const [p, t] = await Promise.all([
    load(slug),
    getTranslations({ locale, namespace: "Storefront.meta" }),
  ]);
  // Absolute links: WhatsApp, Facebook and X fetch the card from outside, so every URL must carry its origin.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = (getEnv().PUBLIC_SITE_URL ?? `${proto}://${host}`).replace(/\/+$/, "");
  const url = `${origin}/${locale}/loja/${slug}`;
  const description = p.description.replace(/\s+/g, " ").trim().slice(0, 120) || t("fallback");
  const first = p.images[0];
  const image = first ? `${origin}${first.url}` : `${origin}/logo-kandrop-full.png`;
  const title = `${p.title} | Kandrop`;
  return {
    title: `${p.title} — ${p.storeName}`,
    description: p.description ? p.description.slice(0, 155) : t("fallback"),
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: "Kandrop", locale, title, description, url, images: [{ url: image, alt: p.title }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

/** The public product page: what a shopper sees after clicking an ad or a shared link. */
export default async function StorefrontPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const product = await load(slug);
  return (
    <>
      <StorePixel id={product.metaPixelId} />
      <StorefrontView product={product} whatsapp={orderPaymentInfo().whatsapp ?? null} />
    </>
  );
}
