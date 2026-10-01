import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PageTransition } from "@/components/shell/PageTransition";
import { SupplierProfileView } from "@/components/vitrine/SupplierProfileView";
import { routing } from "@/i18n/routing";
import { requirePaidSession } from "@/server/auth/pageGate";
import { findSupplier } from "@/server/modules/supplier/service";
import { importedIds, listApprovedCatalog } from "@/server/modules/vitrine/service";
import { toVitrineProduct } from "@/shared/vitrine/catalog";

type Props = { params: Promise<{ locale: string; id: string }> };

const UUID = /^[0-9a-f-]{36}$/i;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supplier = UUID.test(id) ? await findSupplier(id).catch(() => null) : null;
  return { title: `${supplier?.status === "approved" ? supplier.companyName : "Fornecedor"} — Kandrop` };
}

/** An approved supplier's page in the Vitrine, with only its approved products. */
export default async function SupplierProfilePage({ params }: Props) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requirePaidSession(locale);
  if (!UUID.test(id)) notFound();
  const supplier = await findSupplier(id).catch(() => null);
  if (!supplier || supplier.status !== "approved") notFound();
  const [approved, imports] = await Promise.all([listApprovedCatalog(id).catch(() => []), importedIds(session.storeId).catch(() => [])]);
  const [municipality = "", province = ""] = (supplier.address ?? "").split(", ");
  return (
    <PageTransition>
      <SupplierProfileView
        supplier={{ id: supplier.id, name: supplier.companyName, location: [municipality, province].filter(Boolean).join(", "), since: new Date(supplier.createdAt).getFullYear() }}
        products={approved.map((p) => toVitrineProduct(p))}
        importedIds={imports}
      />
    </PageTransition>
  );
}
