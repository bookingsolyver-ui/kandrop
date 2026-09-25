import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { BillingView } from "@/components/billing/BillingView";
import { ListMessage } from "@/components/data/ListStates";
import { PageTransition } from "@/components/shell/PageTransition";
import { routing } from "@/i18n/routing";
import { requirePaidSession } from "@/server/auth/pageGate";

// Depends on the session and on the clock (plan periods): never prerender.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Billing" });
  return { title: `${t("title")} — Kandrop` };
}

export default async function BillingPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await requirePaidSession(locale);
  const t = await getTranslations("Billing");

  return (
    <PageTransition>
      <main>
        <header className="mb-10 max-w-3xl">
          <p className="text-[11px] font-medium tracking-[0.18em] text-accent uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="mt-4 font-serif text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.06] font-normal tracking-[-0.02em] text-balance">
            {t("title")}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-2">{t("subtitle")}</p>
        </header>
        {session!.role === "owner" ? (
          <BillingView />
        ) : (
          <ListMessage title={t("forbidden.title")} body={t("forbidden.body")} />
        )}
      </main>
    </PageTransition>
  );
}
