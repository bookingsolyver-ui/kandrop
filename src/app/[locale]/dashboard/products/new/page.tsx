import type { Metadata } from "next";
import { requirePaidSession } from "@/server/auth/pageGate";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/products/ProductForm";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { PageTransition } from "@/components/shell/PageTransition";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Catalog.form" });
  return { title: `${t("createTitle")} — Kandrop` };
}

export default async function NewProductPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  await requirePaidSession(locale);
  const t = await getTranslations("Catalog.form");

  return (
    <PageTransition>
      <main>
        <header className="mb-8 max-w-2xl">
          <Link
            href="/dashboard/products"
            className="inline-flex min-h-11 items-center text-sm text-ink-2 underline underline-offset-4 hover:text-ink"
          >
            {t("back")}
          </Link>
          <h1 className="mt-2 font-serif text-[2.25rem] leading-[1.05] font-normal tracking-[-0.02em] sm:text-[2.75rem]">
            {t("createTitle")}
          </h1>
          <p className="mt-3 text-base text-ink-2">{t("createSubtitle")}</p>
        </header>
        <ProductForm />
      </main>
    </PageTransition>
  );
}
