import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { LegalPage } from "@/components/marketing/LegalPage";
import { LEGAL } from "@/components/marketing/legal";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export const metadata: Metadata = { title: `${LEGAL.privacidade.title} — Kandrop`, description: LEGAL.privacidade.intro.slice(0, 155) };

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <LegalPage doc={LEGAL.privacidade} />;
}
