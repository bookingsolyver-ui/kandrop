import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { MerchantDetailView } from "@/components/admin/MerchantDetailView";
import { routing } from "@/i18n/routing";
import { requireAdmin } from "@/server/auth/admin";
import { merchantDetail } from "@/server/modules/admin/overview";

type Props = { params: Promise<{ locale: string; id: string }> };

export const metadata: Metadata = { title: "Lojista — Kandrop Admin" };

/** One store's profile, read from the database. */
export default async function MerchantPage({ params }: Props) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  await requireAdmin(locale);
  const merchant = await merchantDetail(id).catch(() => null);
  if (!merchant) notFound();
  return <MerchantDetailView merchant={merchant} />;
}
