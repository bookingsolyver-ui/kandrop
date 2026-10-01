import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AdminSuppliersView } from "@/components/admin/AdminSuppliersView";
import { routing } from "@/i18n/routing";
import { requireAdmin } from "@/server/auth/admin";
import { listSuppliers } from "@/server/modules/supplier/service";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Admin.suppliers" });
  return { title: `${t("title")} — Kandrop Admin` };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  await requireAdmin(locale);
  // Real registrations (Supabase), without the tax number: only what the table shows reaches the browser.
  const real = (await listSuppliers().catch(() => [])).map((r) => ({
    id: r.id, name: r.companyName, email: r.email, phone: r.phone, address: r.address, status: r.status, createdAt: r.createdAt,
  }));
  return <AdminSuppliersView real={real} />;
}
