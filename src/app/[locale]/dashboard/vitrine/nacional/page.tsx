import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PageTransition } from "@/components/shell/PageTransition";
import { VitrineView } from "@/components/vitrine/VitrineView";
import { routing } from "@/i18n/routing";
import { requirePaidSession } from "@/server/auth/pageGate";
import { NATIONAL_PRODUCTS } from "@/shared/vitrine/mock";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Vitrine.national" });
  return { title: `${t("title")} — Kandrop` };
}

/** Showcase of the national catalogue. SAMPLE products for now: swap `NATIONAL_PRODUCTS` for the database query. */
export default async function VitrineNationalPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  await requirePaidSession(locale);
  const t = await getTranslations("Vitrine.national");

  return (
    <PageTransition>
      <div>
        <header className="mb-4 sm:mb-7">
          <h1 className="text-[20px] font-bold tracking-tight text-[var(--ink-900)] sm:text-[26px]">
            {t("title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--ink-600)] sm:text-[15px]">{t("subtitle")}</p>
        </header>
        <VitrineView products={NATIONAL_PRODUCTS} />
      </div>
    </PageTransition>
  );
}
