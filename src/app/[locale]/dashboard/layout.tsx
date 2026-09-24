import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { LiveProvider } from "@/components/dashboard/LiveProvider";
import { AppShell } from "@/components/shell/AppShell";
import { SIDEBAR_COOKIE } from "@/components/shell/constants";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { readSession } from "@/server/auth/session";
import { getMe } from "@/server/modules/auth/service";
import { getStore } from "@/server/modules/store/service";

/** App shell for every page of the merchant area (`/[locale]/dashboard/**`). */
export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Page-level gate for the UI. The API enforces the same rule independently (requireSession).
  const session = await readSession();
  if (!session) redirect({ href: "/login", locale });

  const [me, store, jar] = await Promise.all([getMe(session!), getStore(session!), cookies()]);

  return (
    <LiveProvider>
      <AppShell
        user={{ name: me.fullName, email: me.email }}
        storeName={store.name}
        initialCollapsed={jar.get(SIDEBAR_COOKIE)?.value === "collapsed"}
      >
        {children}
      </AppShell>
    </LiveProvider>
  );
}
