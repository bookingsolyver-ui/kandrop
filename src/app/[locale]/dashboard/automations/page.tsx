import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AutomationsView } from "@/components/automations/AutomationsView";
import { PageTransition } from "@/components/shell/PageTransition";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { readSession } from "@/server/auth/session";
import { getStore } from "@/server/modules/store/service";

// Depends on the session: never prerender.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Shell.nav" });
  return { title: `${t("whatsapp")} — Kandrop` };
}

export default async function AutomationsPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await readSession();
  if (!session) redirect({ href: "/login", locale });
  const [store, t, shell] = await Promise.all([
    getStore(session!),
    getTranslations("Automations"),
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
        <div className="max-w-4xl">
          <AutomationsView storeName={store.name} canManage={session!.role === "owner"} />
        </div>
      </main>
    </PageTransition>
  );
}
