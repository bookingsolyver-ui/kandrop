import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PageTransition } from "@/components/shell/PageTransition";
import { VitrineView } from "@/components/vitrine/VitrineView";
import { routing } from "@/i18n/routing";
import { requirePaidSession } from "@/server/auth/pageGate";
import { importedIds, listApprovedCatalog } from "@/server/modules/vitrine/service";
import { toVitrineProduct } from "@/shared/vitrine/catalog";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Vitrine.national" });
  return { title: `${t("title")} — Kandrop` };
}

/** The showcase: approved products of the real supplier catalogue. */
export default async function VitrineNationalPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requirePaidSession(locale);
  // The real catalogue: only APPROVED supplier products (Supabase), and which of them this store already imported.
  const [approved, imports] = await Promise.all([listApprovedCatalog().catch(() => []), importedIds(session.storeId).catch(() => [])]);
  const products = approved.map((p) => toVitrineProduct(p)).filter((p) => p.kind === "nacional");
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
        <VitrineView products={products} importedIds={imports} />
      </div>
    </PageTransition>
  );
}
