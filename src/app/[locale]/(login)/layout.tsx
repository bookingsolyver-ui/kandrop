import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { readSession } from "@/server/auth/session";

/** The sign-in page owns the whole screen (split layout), so it has no shared header or card. */
export default async function LoginLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Already signed in: nothing to do here.
  if (await readSession()) redirect({ href: "/dashboard", locale });

  return children;
}
