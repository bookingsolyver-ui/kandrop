import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { HomeClosing, HomeCompare, HomeEarnings, HomeFaq, HomeHero, HomeProblem, HomeSolution, HomeSteps } from "@/components/marketing/home";
import { Pricing } from "@/components/marketing/Pricing";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("title"),
    description: t("description"),
    // Tells search engines the same page exists in the other languages.
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])),
    },
  };
}

/** The public landing page: sells Kandrop to merchants, section by section as in the official reference. */
export default async function LandingPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <main>
      <HomeHero />
      <HomeProblem />
      <HomeSolution />
      <HomeSteps />
      <HomeEarnings />
      <HomeCompare />
      <Pricing />
      <HomeFaq />
      <HomeClosing />
    </main>
  );
}
