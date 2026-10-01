import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PageTransition } from "@/components/shell/PageTransition";
import { SupplierProfileView } from "@/components/vitrine/SupplierProfileView";
import { routing } from "@/i18n/routing";
import { requirePaidSession } from "@/server/auth/pageGate";
import { supplierById } from "@/shared/supplier/mock";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supplier = supplierById(id);
  return { title: `${supplier?.name ?? "Fornecedor"} — Kandrop` };
}

/** A supplier's public profile inside the Vitrine, with only its products. SAMPLE suppliers for now. */
export default async function SupplierProfilePage({ params }: Props) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  await requirePaidSession(locale);
  if (!supplierById(id)) notFound();
  return (
    <PageTransition>
      <SupplierProfileView supplierId={id} />
    </PageTransition>
  );
}
