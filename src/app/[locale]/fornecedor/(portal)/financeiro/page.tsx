import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { SupplierFinance } from "@/components/supplier/SupplierFinance";
import { routing } from "@/i18n/routing";
import { requireSupplier } from "@/server/auth/supplierGate";
import { supplierBank } from "@/server/modules/supplier/catalog";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Supplier.meta" });
  return { title: `${t("finance")} — Kandrop` };
}

/** Payout account (IBAN encrypted at rest) and the balances. */
export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const supplier = await requireSupplier(locale);
  // Masked on the server: the IBAN is decrypted only to show its last four digits.
  const bank = await supplierBank.get(supplier.id).catch(() => null);
  return <SupplierFinance bank={bank} />;
}
