import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AdminLogisticsView } from "@/components/admin/AdminLogisticsView";
import { routing } from "@/i18n/routing";
import { requireAdmin } from "@/server/auth/admin";
import { listAllLogistics } from "@/server/modules/fulfilment/service";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Admin.logistics" });
  return { title: `${t("title")} — Kandrop Admin` };
}

/** Every supplier order of the platform, from the supplier's warehouse to the shopper. */
export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  await requireAdmin(locale);
  const rows = await listAllLogistics().catch((err) => {
    console.error("[admin] could not load the logistics list", err instanceof Error ? err.message : err);
    return [];
  });
  return <AdminLogisticsView rows={rows} />;
}
