import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { SupplierOrders } from "@/components/supplier/SupplierOrders";
import { routing } from "@/i18n/routing";
import { requireSupplier } from "@/server/auth/supplierGate";
import { supplierOrderRows } from "@/server/modules/fulfilment/supplierView";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Supplier.meta" });
  return { title: `${t("orders")} — Kandrop` };
}

/** What was sold and has to be prepared for Kandrop to collect. */
export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const supplier = await requireSupplier(locale);
  return <SupplierOrders orders={await supplierOrderRows(supplier.id)} />;
}
