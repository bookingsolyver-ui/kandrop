import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { MerchantDetailView } from "@/components/admin/MerchantDetailView";
import { routing } from "@/i18n/routing";
import { requireAdmin } from "@/server/auth/admin";
import { merchantById } from "@/shared/admin/mock";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `${merchantById(id)?.store ?? "Lojista"} — Kandrop Admin` };
}

export default async function MerchantPage({ params }: Props) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  await requireAdmin(locale);
  if (!merchantById(id)) notFound();
  return <MerchantDetailView merchantId={id} />;
}
