import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ContactCards } from "@/components/support/ContactCards";
import { FaqAccordion, type FaqItem } from "@/components/support/FaqAccordion";
import { InfoBox } from "@/components/support/InfoBox";
import { TicketForm } from "@/components/support/TicketForm";
import { PageTransition } from "@/components/shell/PageTransition";
import { routing } from "@/i18n/routing";
import { requirePaidSession } from "@/server/auth/pageGate";
import { supportContacts } from "@/server/modules/support/contacts";
import { COMMISSION_BPS } from "@/shared/affiliates/schemas";
import { MIN_PAYOUT } from "@/shared/payouts/schemas";

// The contact details come from the environment: never prerender.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Support" });
  return { title: `${t("title")} — Kandrop` };
}

export default async function SupportPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  await requirePaidSession(locale);

  const [t, shell, format] = await Promise.all([
    getTranslations("Support"),
    getTranslations("Shell.groups"),
    getFormatter(),
  ]);

  // The figures in the answers are the product's real ones, formatted for the reader.
  const values = {
    min: format.number(MIN_PAYOUT / 100, {
      style: "currency",
      currency: "AOA",
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    }),
    rate: format.number(COMMISSION_BPS / 10_000, { style: "percent" }),
  };
  const faq: FaqItem[] = (["q1", "q2", "q3", "q4", "q5"] as const).map((id) => ({
    id,
    question: t(`faq.${id}.q`),
    answer: t(`faq.${id}.a`, values),
  }));

  return (
    <PageTransition>
      <main className="space-y-8">
        <header className="max-w-3xl">
          <p className="text-[11px] font-medium tracking-[0.18em] text-accent uppercase">
            {shell("other")}
          </p>
          <h1 className="mt-4 font-serif text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.06] font-normal tracking-[-0.02em] text-balance">
            {t("title")}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-2">{t("subtitle")}</p>
        </header>

        <ContactCards contacts={supportContacts()} />
        <InfoBox />

        <section
          aria-labelledby="faq-title"
          className="rounded-lg border border-line bg-surface px-5 py-6 sm:px-8 sm:py-8"
        >
          <h2
            id="faq-title"
            className="font-serif text-[1.5rem] leading-tight font-medium tracking-tight"
          >
            {t("faq.title")}
          </h2>
          <p className="mt-1 mb-3 text-sm text-ink-muted">{t("faq.subtitle")}</p>
          <FaqAccordion items={faq} />
        </section>

        <section
          aria-labelledby="ticket-title"
          className="rounded-lg border border-line bg-surface p-5 sm:p-8"
        >
          <h2
            id="ticket-title"
            className="font-serif text-[1.5rem] leading-tight font-medium tracking-tight"
          >
            {t("ticket.title")}
          </h2>
          <p className="mt-1 mb-6 text-sm text-ink-muted">{t("ticket.intro")}</p>
          <TicketForm />
        </section>
      </main>
    </PageTransition>
  );
}
