import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { SupplierLoginScreen } from "@/components/supplier/SupplierAuth";
import { routing } from "@/i18n/routing";
import { redirectIfSupplier } from "@/server/auth/supplierGate";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ registered?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Supplier.meta" });
  return { title: `${t("login")} — Kandrop` };
}

/** Supplier sign-in / sign-up (real accounts: Supabase Auth + the `suppliers` table). */
export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params;
  const registered = (await searchParams).registered === "1";
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  await redirectIfSupplier(locale);
  return <SupplierLoginScreen registered={registered} />;
}
