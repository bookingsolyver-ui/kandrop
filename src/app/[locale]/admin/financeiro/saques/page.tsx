import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AdminPayoutsView } from "@/components/admin/AdminPayoutsView";
import { routing } from "@/i18n/routing";
import { requireAdmin } from "@/server/auth/admin";
import { listAllMerchantPayouts } from "@/server/modules/payouts/admin";
import { listAllWithdrawals } from "@/server/modules/supplier/withdrawals";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Admin.payouts" });
  return { title: `${t("title")} — Kandrop Admin` };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  await requireAdmin(locale);
  return <AdminPayoutsView rows={await listAllWithdrawals().catch(() => [])} merchantRows={await listAllMerchantPayouts().catch(() => [])} />;
}
