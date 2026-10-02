import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { CouponsView } from "@/components/coupons/CouponsView";
import { PageTransition } from "@/components/shell/PageTransition";
import { routing } from "@/i18n/routing";
import { requirePaidSession } from "@/server/auth/pageGate";
import { couponRepository } from "@/server/modules/coupons/repository";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Coupons" });
  return { title: `${t("title")} — Kandrop` };
}

/** The merchant's discount codes, read from Supabase and scoped to the store. */
export default async function CouponsPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requirePaidSession(locale);
  // Until the coupons migration is applied the list is simply empty.
  const coupons = await couponRepository.list(session.storeId).catch(() => []);
  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-[1440px]">
        <CouponsView coupons={coupons} canManage={session.role === "owner"} />
      </div>
    </PageTransition>
  );
}
