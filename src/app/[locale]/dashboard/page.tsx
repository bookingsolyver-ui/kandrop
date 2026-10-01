import { hasLocale } from "next-intl";
import { requirePaidSession } from "@/server/auth/pageGate";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { KaiDashboard } from "@/components/kai/KaiDashboard";
import { routing } from "@/i18n/routing";
import { PageTransition } from "@/components/shell/PageTransition";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  await requirePaidSession(locale);

  return (
    <PageTransition>
      <div className="space-y-6">
        <KaiDashboard />
      </div>
    </PageTransition>
  );
}
