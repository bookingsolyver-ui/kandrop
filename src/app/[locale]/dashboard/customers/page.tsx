import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { CustomersView } from "@/components/customers/CustomersView";
import { PageTransition } from "@/components/shell/PageTransition";
import { routing } from "@/i18n/routing";
import { requirePaidSession } from "@/server/auth/pageGate";
import { listCustomers } from "@/server/modules/customers/service";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Customers" });
  return { title: `${t("title")} — Kandrop` };
}

/** The store's customers, built from its real orders. */
export default async function CustomersPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requirePaidSession(locale);
  const customers = await listCustomers(session.storeId);

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-[1440px]">
        <CustomersView customers={customers} />
      </div>
    </PageTransition>
  );
}
