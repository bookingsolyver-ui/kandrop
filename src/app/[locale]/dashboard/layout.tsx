import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { LiveProvider } from "@/components/dashboard/LiveProvider";
import { AppShell } from "@/components/shell/AppShell";
import { SIDEBAR_COOKIE } from "@/components/shell/constants";
import { routing } from "@/i18n/routing";
import { requirePaidSession } from "@/server/auth/pageGate";
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

  // Page-level gate for the UI: signed in AND paid (else /login or /checkout). The API enforces the
  // same rule independently (requireSession). A layout is not re-run on client-side navigation, so
  // every page repeats the check with the same helper.
  const session = await requirePaidSession(locale);

  const [me, store, jar] = await Promise.all([getMe(session), getStore(session), cookies()]);

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
