import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PageTransition } from "@/components/shell/PageTransition";
import { FavoritesView } from "@/components/vitrine/FavoritesView";
import { routing } from "@/i18n/routing";
import { requirePaidSession } from "@/server/auth/pageGate";
import { importedIds, listApprovedCatalog } from "@/server/modules/vitrine/service";
import { toVitrineProduct } from "@/shared/vitrine/catalog";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "MyProducts" });
  return { title: `${t("fav.title")} — Kandrop` };
}

export default async function FavoritesPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requirePaidSession(locale);
  const [approved, imports] = await Promise.all([listApprovedCatalog().catch(() => []), importedIds(session.storeId).catch(() => [])]);
  const catalog = approved.map((p) => toVitrineProduct(p));

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-[1440px]">
        <FavoritesView catalog={catalog} importedIds={imports} />
      </div>
    </PageTransition>
  );
}
