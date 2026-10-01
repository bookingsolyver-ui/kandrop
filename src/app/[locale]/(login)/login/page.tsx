import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string | string[] }> };

/** Only our own console is a valid place to come back to (no open redirect). */
const safeNext = (v: string | string[] | undefined) => {
  const n = Array.isArray(v) ? v[0] : v;
  return n && /^\/admin(\/[\w-]*)*$/.test(n) ? n : undefined;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Auth.login" });
  return { title: `${t("title")} — Kandrop` };
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const next = safeNext((await searchParams).next);
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <LoginScreen next={next} />;
}
