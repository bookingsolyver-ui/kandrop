import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { routing } from "@/i18n/routing";
import { PageTransition } from "@/components/shell/PageTransition";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Dashboard");

  return (
    <PageTransition>
      <main>
        <header className="mb-10 max-w-2xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted">
            {t("eyebrow")}
          </p>
          <h1 className="mt-3 font-serif text-[2.75rem] leading-[1.05] font-normal tracking-[-0.02em]">
            {t("title")}
          </h1>
          <p className="mt-3 text-base text-ink-2">{t("subtitle")}</p>
        </header>
        <DashboardView />
      </main>
    </PageTransition>
  );
}
