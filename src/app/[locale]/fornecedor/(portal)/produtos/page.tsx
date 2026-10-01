import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { SupplierProducts } from "@/components/supplier/SupplierProducts";
import { routing } from "@/i18n/routing";
import { requireSupplier } from "@/server/auth/supplierGate";
import { supplierProducts } from "@/server/modules/supplier/catalog";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Supplier.meta" });
  return { title: `${t("products")} — Kandrop` };
}

/** The supplier's real catalogue (Supabase), scoped to the signed-in supplier. */
export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const supplier = await requireSupplier(locale);
  const products = (await supplierProducts.list(supplier.id).catch(() => [])).map((p) => ({
    id: p.id, name: p.name, description: p.description, category: p.category, costPrice: p.costPrice, stock: p.stock, status: p.status, hasImage: p.hasImage, updatedAt: p.updatedAt,
  }));
  return <SupplierProducts products={products} />;
}
