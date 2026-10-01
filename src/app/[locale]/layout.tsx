import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import { routing } from "@/i18n/routing";
import "../globals.css";

// The platform's one typeface (the waitlist uses it too). Exposed as `--font-jakarta`;
// `--font-sans` (Tailwind's `font-sans`, and the `<body>`) reads it in globals.css.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

// Every page is rendered per request: the Content-Security-Policy carries a fresh nonce (see src/proxy.ts),
// and a prerendered page would have no nonce on its scripts.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("title"),
    description: t("description"),
    // The tab icons come from the file convention: src/app/icon.svg (+ icon.png fallback) and apple-icon.png.
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    // `data-scroll-behavior`: the public pages scroll smoothly (see `.marketing`); this tells Next to
    // pause that during route transitions, as it asks.
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      className={`${jakarta.variable} ${mono.variable}`}
    >
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <MetaPixel />
      </body>
    </html>
  );
}
