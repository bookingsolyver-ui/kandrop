import { hasLocale } from "next-intl";
import { requirePaidSession } from "@/server/auth/pageGate";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { KaiDashboard } from "@/components/kai/KaiDashboard";
import { routing } from "@/i18n/routing";
import { TopSellers } from "@/components/dashboard/TopSellers";
import { WinningProducts } from "@/components/dashboard/WinningProducts";
import { getMonthlyRanking } from "@/server/modules/ranking/service";
import { listWinningProducts } from "@/server/modules/vitrine/winning";
import { PageTransition } from "@/components/shell/PageTransition";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requirePaidSession(locale);
  const [winning, ranking] = await Promise.all([
    listWinningProducts(6),
    getMonthlyRanking(session.storeId),
  ]);

  return (
    <PageTransition>
      <div className="space-y-6">
        <WinningProducts products={winning} locale={locale} />
        <KaiDashboard />
        <TopSellers ranking={ranking} locale={locale} />
      </div>
    </PageTransition>
  );
}
