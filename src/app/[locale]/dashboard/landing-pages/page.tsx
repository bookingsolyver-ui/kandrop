import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { LandingPagesView } from "@/components/landing/LandingPagesView";
import { PageTransition } from "@/components/shell/PageTransition";
import { routing } from "@/i18n/routing";
import { requirePaidSession } from "@/server/auth/pageGate";
import { getEnv } from "@/server/config/env";
import { myProductRows } from "@/server/modules/products/myProducts";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "LandingPages" });
  return { title: `${t("title")} — Kandrop` };
}

/** One sales page and one direct checkout per product of the merchant: the real, public ones. */
export default async function LandingPagesPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requirePaidSession(locale);
  const products = await myProductRows(session.storeId);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const siteOrigin = (getEnv().PUBLIC_SITE_URL ?? `${proto}://${host}`).replace(/\/+$/, "");

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-[1440px]">
        <LandingPagesView products={products} siteOrigin={siteOrigin} />
      </div>
    </PageTransition>
  );
}
