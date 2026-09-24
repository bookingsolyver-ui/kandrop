import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { RevealController } from "@/components/marketing/RevealController";
import { routing } from "@/i18n/routing";

/** Public site: dark, one accent (see `.marketing` in globals.css). Static: no session is read here. */
export default async function MarketingLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Marketing.nav");

  return (
    <div className="marketing min-h-screen bg-page text-ink">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-surface px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t("skip")}
      </a>
      <MarketingNav />
      <div id="conteudo" tabIndex={-1} className="outline-none">
        {children}
      </div>
      <MarketingFooter />
      <RevealController />
    </div>
  );
}
