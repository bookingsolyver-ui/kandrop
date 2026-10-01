import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { routing } from "@/i18n/routing";
import { requireAdmin } from "@/server/auth/admin";
import { userRepository } from "@/server/modules/auth/userRepository";

// The operator console: never cached, never indexed, only for the accounts in `ADMIN_EMAILS`.
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireAdmin(locale);
  const user = await userRepository.findById(session.userId);
  return <AdminShell user={user?.fullName ?? "Admin"}>{children}</AdminShell>;
}
