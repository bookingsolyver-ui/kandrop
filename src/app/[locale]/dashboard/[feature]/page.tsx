import type { Metadata } from "next";
import { requirePaidSession } from "@/server/auth/pageGate";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PageTransition } from "@/components/shell/PageTransition";
import { NAV_GROUPS, SOON_ITEMS, segmentOf } from "@/components/shell/nav";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string; feature: string }> };

const featureOf = (segment: string) => SOON_ITEMS.find((item) => segmentOf(item) === segment);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, feature } = await params;
  const item = featureOf(feature);
  if (!hasLocale(routing.locales, locale) || !item) notFound();
  const t = await getTranslations({ locale, namespace: "Shell" });
  return { title: `${t(`nav.${item.key}`)} — Kandrop` };
}

/**
 * Every area on the roadmap that is not built yet. It says so plainly (a "Soon" badge and one
 * sentence on what it will do) instead of pretending: no fake data, no dead link.
 * Real pages (`products`, `orders`, `wallet`, `settings`) are static segments and win over this one.
 */
export default async function ComingSoonPage({ params }: Props) {
  const { locale, feature } = await params;
  const item = featureOf(feature);
  if (!hasLocale(routing.locales, locale) || !item) notFound();
  setRequestLocale(locale);
  await requirePaidSession(locale);
  const t = await getTranslations("Shell");
  const c = await getTranslations("ComingSoon");
  const group = NAV_GROUPS.find((g) => g.items.some((i) => i.key === item.key));

  return (
    <PageTransition>
      <main>
        <header className="mb-8 max-w-2xl">
          <p className="text-[11px] font-medium tracking-[0.18em] text-ink-muted uppercase">
            {group ? t(`groups.${group.key}`) : t("nav.plans")}
          </p>
          <h1 className="mt-3 font-serif text-[2.25rem] leading-[1.05] font-normal tracking-[-0.02em] sm:text-[2.75rem]">
            {t(`nav.${item.key}`)}
          </h1>
        </header>

        <section className="max-w-2xl rounded-lg border border-line bg-surface p-6 sm:p-8">
          <p className="inline-flex rounded-full border border-accent px-3 py-1 text-[11px] font-medium tracking-[0.14em] text-accent uppercase">
            {t("soon")}
          </p>
          <p className="mt-5 text-lg leading-relaxed text-ink">{c(`features.${item.key}`)}</p>
          <p className="mt-3 text-sm text-ink-muted">{c("note")}</p>
        </section>
      </main>
    </PageTransition>
  );
}
