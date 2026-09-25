import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AffiliateHero } from "@/components/affiliates/AffiliateHero";
import { AffiliatesView } from "@/components/affiliates/AffiliatesView";
import { ListMessage } from "@/components/data/ListStates";
import { PageTransition } from "@/components/shell/PageTransition";
import { routing } from "@/i18n/routing";
import { requirePaidSession } from "@/server/auth/pageGate";

// Depends on the session: never prerender.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Affiliates" });
  return { title: `${t("title")} — Kandrop` };
}

export default async function AffiliatesPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await requirePaidSession(locale);
  const t = await getTranslations("Affiliates");

  return (
    <PageTransition>
      <main className="space-y-6">
        <AffiliateHero />
        {session!.role === "owner" ? (
          <AffiliatesView />
        ) : (
          <ListMessage title={t("forbidden.title")} body={t("forbidden.body")} />
        )}
      </main>
    </PageTransition>
  );
}
