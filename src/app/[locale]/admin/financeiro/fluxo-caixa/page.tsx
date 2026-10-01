import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { CashFlowView } from "@/components/admin/CashFlowView";
import { routing } from "@/i18n/routing";
import { requireAdmin } from "@/server/auth/admin";
import { cashFlow } from "@/server/modules/admin/overview";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Admin.cash" });
  return { title: `${t("title")} — Kandrop Admin` };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  await requireAdmin(locale);
  const data = await cashFlow().catch((err) => {
    console.error("[admin] cash flow failed", err instanceof Error ? err.message : err);
    return { totals: { gmv: 0, revenue: 0, held: 0, inTransit: 0, stores: 0 }, series: [], ledger: [] };
  });
  return <CashFlowView data={data} />;
}
