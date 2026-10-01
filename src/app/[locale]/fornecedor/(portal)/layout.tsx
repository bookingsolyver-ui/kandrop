import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SupplierProvider } from "@/components/supplier/SupplierProvider";
import { SupplierShell } from "@/components/supplier/SupplierShell";
import { routing } from "@/i18n/routing";
import { requireSupplier } from "@/server/auth/supplierGate";
import type { Supplier } from "@/shared/supplier/mock";

export const metadata = { robots: { index: false, follow: false } };

/** The portal is only for a signed-in supplier (the proxy checked first; this is the second lock). */
export default async function SupplierPortalLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const record = await requireSupplier(locale);
  const [municipality = "", province = ""] = (record.address ?? "").split(", ");
  // Only what the screens show reaches the browser: the tax number never does (not even decrypted).
  const supplier: Supplier = {
    id: record.id,
    name: record.companyName,
    nif: "",
    kind: "nacional",
    province,
    municipality,
    phone: record.phone ?? "",
    email: record.email,
    rating: 0,
    reviews: 0,
    since: new Date(record.createdAt).getFullYear(),
    description: "",
    brands: [record.companyName],
    banner: ["#ff7e2e", "#ff5a00"],
    status: record.status === "approved" ? "active" : "pending_review",
  };
  return (
    <SupplierProvider supplier={supplier}>
      <SupplierShell>{children}</SupplierShell>
    </SupplierProvider>
  );
}
