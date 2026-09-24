import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Link, redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { readSession } from "@/server/auth/session";

/** Quiet, centred shell for login and registration: wordmark, one card, one honest security tip. */
export default async function AuthLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Already signed in: the auth pages have nothing to offer.
  if (await readSession()) redirect({ href: "/dashboard", locale });

  const t = await getTranslations("Auth");
  const common = await getTranslations("Common");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-serif text-2xl font-semibold tracking-tight text-ink">
          {common("appName")}
        </Link>
        <LocaleSwitcher />
      </header>

      <main className="mx-auto flex w-full max-w-[28rem] flex-1 flex-col justify-center px-4 py-10 sm:px-0">
        {children}
        <p className="mt-8 text-center text-[13px] leading-relaxed text-ink-muted">
          {t("securityNote")}
        </p>
      </main>
    </div>
  );
}
