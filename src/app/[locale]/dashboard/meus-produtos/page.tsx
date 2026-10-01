import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PageTransition } from "@/components/shell/PageTransition";
import { MyProductsView } from "@/components/vitrine/MyProductsView";
import { routing } from "@/i18n/routing";
import { headers } from "next/headers";
import { requirePaidSession } from "@/server/auth/pageGate";
import { getEnv } from "@/server/config/env";
import { myProductRows } from "@/server/modules/products/myProducts";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "MyProducts" });
  return { title: `${t("title")} — Kandrop` };
}

/** The merchant's real products, with the buttons to see and share each public sales page. */
export default async function MyProductsPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requirePaidSession(locale);
  const products = await myProductRows(session.storeId);
  // The address the links are built on: the configured public one, else the one this request came to.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const siteOrigin = (getEnv().PUBLIC_SITE_URL ?? `${proto}://${host}`).replace(/\/+$/, "");

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-[1440px]">
        <MyProductsView products={products} siteOrigin={siteOrigin} />
      </div>
    </PageTransition>
  );
}
