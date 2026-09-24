import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/** Public pages that exist in the navigation but are not written yet: `/afiliados`, `/sobre`. */
const PAGES = { afiliados: "affiliates", sobre: "about" } as const;
type Props = { params: Promise<{ locale: string; page: string }> };

const keyOf = (page: string) => (PAGES as Record<string, "affiliates" | "about">)[page];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, page } = await params;
  const key = keyOf(page);
  if (!hasLocale(routing.locales, locale) || !key) notFound();
  const t = await getTranslations({ locale, namespace: "Marketing.pages" });
  return { title: `${t(`${key}.title`)} — Kandrop` };
}

export default async function MarketingSubPage({ params }: Props) {
  const { locale, page } = await params;
  const key = keyOf(page);
  if (!hasLocale(routing.locales, locale) || !key) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Marketing.pages");
  const nav = await getTranslations("Marketing.nav");

  return (
    <main className="mx-auto max-w-3xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
      <p className="inline-flex rounded-full border border-accent px-3 py-1 text-[11px] font-medium tracking-[0.14em] text-accent uppercase">
        {t("soon")}
      </p>
      <h1 className="mt-6 font-serif text-[clamp(2.5rem,6vw,4rem)] leading-[1.05] font-normal tracking-[-0.02em]">
        {t(`${key}.title`)}
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-ink-2">{t(`${key}.body`)}</p>
      <Link
        href="/"
        className="mt-10 inline-flex h-12 items-center rounded-md border border-field px-6 font-medium hover:bg-ink/5"
      >
        {nav("home")}
      </Link>
    </main>
  );
}
