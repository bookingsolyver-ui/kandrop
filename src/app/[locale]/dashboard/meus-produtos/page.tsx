import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PageTransition } from "@/components/shell/PageTransition";
import { MyProductsView } from "@/components/vitrine/MyProductsView";
import { routing } from "@/i18n/routing";
import { requirePaidSession } from "@/server/auth/pageGate";
import { IMPORTED_PRODUCTS } from "@/shared/vitrine/imported";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "MyProducts" });
  return { title: `${t("title")} — Kandrop` };
}

/** The products the merchant imported from the Vitrine. SAMPLE data: swap `IMPORTED_PRODUCTS` for the store's rows. */
export default async function MyProductsPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  await requirePaidSession(locale);

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-[1440px]">
        <MyProductsView initial={IMPORTED_PRODUCTS} />
      </div>
    </PageTransition>
  );
}
