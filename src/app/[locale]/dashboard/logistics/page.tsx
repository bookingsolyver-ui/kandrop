import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { LogisticsView } from "@/components/logistics/LogisticsView";
import { PageTransition } from "@/components/shell/PageTransition";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { readSession } from "@/server/auth/session";

// Depends on the session: never prerender.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Shell.nav" });
  return { title: `${t("logistics")} — Kandrop` };
}

export default async function LogisticsPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await readSession();
  if (!session) redirect({ href: "/login", locale });
  const [t, shell] = await Promise.all([
    getTranslations("Logistics"),
    getTranslations("Shell.groups"),
  ]);

  return (
    <PageTransition>
      <main>
        <header className="mb-10 max-w-3xl">
          <p className="text-[11px] font-medium tracking-[0.18em] text-accent uppercase">
            {shell("accelerators")}
          </p>
          <h1 className="mt-4 font-serif text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.06] font-normal tracking-[-0.02em] text-balance">
            {t("title")}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-2">{t("subtitle")}</p>
        </header>
        <LogisticsView canManage={session!.role === "owner"} />
      </main>
    </PageTransition>
  );
}
