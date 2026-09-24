import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { cache } from "react";
import { StorefrontView } from "@/components/storefront/StorefrontView";
import { routing } from "@/i18n/routing";
import { ApiError } from "@/server/http/errors";
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
  return {
    title: `${p.title} — ${p.storeName}`,
    description: p.description ? p.description.slice(0, 155) : t("fallback"),
  };
}

/** The public product page: what a shopper sees after clicking an ad or a shared link. */
export default async function StorefrontPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <StorefrontView product={await load(slug)} />;
}
