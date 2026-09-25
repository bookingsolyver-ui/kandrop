import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AcademyView } from "@/components/academy/AcademyView";
import { PageTransition } from "@/components/shell/PageTransition";
import { routing } from "@/i18n/routing";
import { requirePaidSession } from "@/server/auth/pageGate";

// Depends on the session (progress is personal): never prerender.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Academy" });
  return { title: `${t("title")} — Kandrop` };
}

export default async function AcademyPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  await requirePaidSession(locale);
  const [t, shell] = await Promise.all([
    getTranslations("Academy"),
    getTranslations("Shell.groups"),
  ]);

  return (
    <PageTransition>
      <main>
        <header className="mb-10 max-w-3xl">
          <p className="text-[11px] font-medium tracking-[0.18em] text-accent uppercase">
            {shell("other")}
          </p>
          <h1 className="mt-4 font-serif text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.06] font-normal tracking-[-0.02em] text-balance">
            {t("title")}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-2">{t("subtitle")}</p>
        </header>
        <AcademyView />
      </main>
    </PageTransition>
  );
}
