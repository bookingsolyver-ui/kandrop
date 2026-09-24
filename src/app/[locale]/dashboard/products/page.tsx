import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ProductsView } from "@/components/products/ProductsView";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { PageTransition } from "@/components/shell/PageTransition";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Catalog" });
  return { title: `${t("title")} — Kandrop` };
}

export default async function ProductsPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Catalog");

  return (
    <PageTransition>
      <main>
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium tracking-[0.18em] text-ink-muted uppercase">
              {t("eyebrow")}
            </p>
            <h1 className="mt-3 font-serif text-[2.25rem] leading-[1.05] font-normal tracking-[-0.02em] sm:text-[2.75rem]">
              {t("title")}
            </h1>
            <p className="mt-3 text-base text-ink-2">{t("subtitle")}</p>
          </div>
          <Link
            href="/dashboard/products/new"
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-md bg-action px-6 text-sm font-semibold text-on-action hover:opacity-90"
          >
            {t("add")}
          </Link>
        </header>
        <ProductsView />
      </main>
    </PageTransition>
  );
}
