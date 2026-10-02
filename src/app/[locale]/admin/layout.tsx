import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { RealtimeNotifications } from "@/components/notifications/RealtimeNotifications";
import { AdminShell } from "@/components/admin/AdminShell";
import { routing } from "@/i18n/routing";
import { AdminRestricted } from "@/components/admin/AdminRestricted";
import { isAdmin } from "@/server/auth/admin";
import { readSession } from "@/server/auth/session";
import { redirect } from "@/i18n/navigation";
import { userRepository } from "@/server/modules/auth/userRepository";

// The operator console: never cached, never indexed, only for the accounts in `ADMIN_EMAILS`; everyone else sees the restricted screen.
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await readSession();
  if (!session) return redirect({ href: { pathname: "/login", query: { next: "/admin" } }, locale });
  if (!(await isAdmin(session))) return <AdminRestricted />;
  const user = await userRepository.findById(session.userId);
  return (
    <>
      <RealtimeNotifications scope="admin" />
      <AdminShell user={user?.fullName ?? "Admin"}>{children}</AdminShell>
    </>
  );
}
