import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { FinalCta } from "@/components/marketing/FinalCta";
import { HeroVisual } from "@/components/marketing/HeroVisual";
import { ArrowIcon } from "@/components/marketing/icons";
import { Pillars } from "@/components/marketing/Pillars";
import { Pricing } from "@/components/marketing/Pricing";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("title"),
    description: t("description"),
    // Tells search engines the same page exists in the other languages.
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])),
    },
  };
}

/** The public landing page: sells Kandrop to merchants. */
export default async function LandingPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Marketing.hero");

  return (
    <main>
      <section id="inicio" aria-labelledby="hero-title" className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[38rem] w-[70rem] -translate-x-1/2 bg-[radial-gradient(closest-side,var(--glow),transparent)]"
        />
        <div className="mx-auto grid max-w-7xl gap-16 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-12 lg:px-8 lg:pt-24 lg:pb-32">
          <div>
            <p
              className="enter inline-flex items-center gap-2.5 rounded-full border border-line px-4 py-1.5 text-[13px] text-ink-2"
              style={{ "--i": 0 } as React.CSSProperties}
            >
              <span aria-hidden className="size-1.5 rounded-full bg-accent" />
              {t("eyebrow")}
            </p>

            <h1
              id="hero-title"
              className="enter mt-7 font-serif text-[clamp(2.75rem,6.4vw,5.25rem)] leading-[0.98] font-normal tracking-[-0.03em] text-balance"
              style={{ "--i": 1 } as React.CSSProperties}
            >
              {t.rich("title1", {
                nowrap: (chunks) => <span className="whitespace-nowrap">{chunks}</span>,
              })}{" "}
              <span className="sm:block">{t("title2")}</span>{" "}
              <span className="text-accent sm:block">{t("title3")}</span>
            </h1>

            <p
              className="enter mt-7 max-w-xl text-lg leading-relaxed text-ink-2 sm:text-xl"
              style={{ "--i": 2 } as React.CSSProperties}
            >
              {t("subtitle")}
            </p>

            <div
              className="enter mt-10 flex flex-col gap-3 sm:flex-row"
              style={{ "--i": 3 } as React.CSSProperties}
            >
              <Link
                href="/register"
                className="inline-flex h-14 items-center justify-center gap-3 rounded-md bg-accent px-8 text-base font-semibold text-on-action transition-opacity hover:opacity-90"
              >
                {t("primary")}
                <ArrowIcon />
              </Link>
              <Link
                href="/#planos"
                className="inline-flex h-14 items-center justify-center rounded-md border border-field px-8 text-base font-medium text-ink hover:bg-ink/5"
              >
                {t("secondary")}
              </Link>
            </div>
          </div>

          <div className="enter" style={{ "--i": 4 } as React.CSSProperties}>
            <HeroVisual />
          </div>
        </div>
      </section>

      <Pillars />
      <Pricing />
      <FinalCta />
    </main>
  );
}
