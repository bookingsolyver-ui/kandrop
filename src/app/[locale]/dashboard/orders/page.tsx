import type { Metadata } from "next";
import { requirePaidSession } from "@/server/auth/pageGate";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { OrdersView } from "@/components/orders/OrdersView";
import { routing } from "@/i18n/routing";
import { PageTransition } from "@/components/shell/PageTransition";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Orders" });
  return { title: `${t("title")} — Kandrop` };
}

export default async function OrdersPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  await requirePaidSession(locale);
  const t = await getTranslations("Orders");

  return (
    <PageTransition>
      <main>
        <header className="mb-8 max-w-2xl">
          <p className="text-[11px] font-medium tracking-[0.18em] text-ink-muted uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="mt-3 font-serif text-[2.25rem] leading-[1.05] font-normal tracking-[-0.02em] sm:text-[2.75rem]">
            {t("title")}
          </h1>
          <p className="mt-3 text-base text-ink-2">{t("subtitle")}</p>
        </header>
        <OrdersView />
      </main>
    </PageTransition>
  );
}
