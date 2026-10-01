import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AuditLogsView } from "@/components/admin/AuditLogsView";
import { routing } from "@/i18n/routing";
import { requireAdmin } from "@/server/auth/admin";
import { listAudit } from "@/server/modules/audit/service";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Admin.audit" });
  return { title: `${t("title")} — Kandrop Admin` };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  await requireAdmin(locale);
  const { rows, missing } = await listAudit();
  return <AuditLogsView rows={rows} missing={missing} />;
}
