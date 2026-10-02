import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Panel } from "@/components/dashboard/Panel";
import { StoreSupportForm } from "@/components/settings/StoreSupportForm";
import { NotificationsForm } from "@/components/settings/NotificationsForm";
import { MetaPixelForm } from "@/components/settings/MetaPixelForm";
import { StoreLocationForm } from "@/components/settings/StoreLocationForm";
import { BankAccountForm } from "@/components/settings/BankAccountForm";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { isSettingsTab } from "@/components/settings/tabs";
import { formatLocales, routing } from "@/i18n/routing";
import { requirePaidSession } from "@/server/auth/pageGate";
import { getMe } from "@/server/modules/auth/service";
import { getBankAccount } from "@/server/modules/bank/service";
import { getStore } from "@/server/modules/store/service";
import { PageTransition } from "@/components/shell/PageTransition";

// Depends on the session: never prerender.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Settings" });
  return { title: `${t("title")} — Kandrop` };
}

function Rows({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="divide-y divide-line text-sm">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3 first:pt-0 last:pb-0"
        >
          <dt className="text-ink-muted">{label}</dt>
          <dd className="min-w-0 text-right font-medium break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function SettingsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await requirePaidSession(locale);
  const { tab } = await searchParams;
  const [me, store, bank, t] = await Promise.all([
    getMe(session!),
    getStore(session!),
    getBankAccount(session!),
    getTranslations("Settings"),
  ]);
  const currency = new Intl.DisplayNames(formatLocales[locale as keyof typeof formatLocales], {
    type: "currency",
  }).of(store.currency);

  return (
    <PageTransition>
      <div>
        <header className="mb-8 max-w-2xl">
          <p className="text-[11px] font-medium tracking-[0.18em] text-ink-muted uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="mt-3 font-serif text-[2.25rem] leading-[1.05] font-normal tracking-[-0.02em] sm:text-[2.75rem]">
            {t("title")}
          </h1>
          <p className="mt-3 text-base text-ink-2">{t("subtitle")}</p>
        </header>

        <SettingsTabs
          initial={isSettingsTab(tab) ? tab : "profile"}
          panels={{
            profile: (
              <div className="max-w-2xl">
                <Panel title={t("account.title")} subtitle={t("account.subtitle")}>
                  <Rows
                    rows={[
                      [t("account.name"), me.fullName],
                      [t("account.email"), me.email],
                      [t("account.role"), t(`roles.${me.role}`)],
                    ]}
                  />
                </Panel>
                <div className="mt-6">
                  <Panel title={t("location.title")} subtitle={t("location.subtitle")}>
                    <StoreLocationForm initial={{ province: store.province, municipality: store.municipality }} canEdit={session!.role === "owner"} />
                  </Panel>
                </div>
              </div>
            ),
            store: (
              <div className="max-w-2xl">
                <Panel title={t("store.title")} subtitle={t("store.subtitle")}>
                  <Rows
                    rows={[
                      [t("store.name"), store.name],
                      [
                        t("store.nif"),
                        store.nif ?? (
                          <span className="font-normal text-ink-muted">{t("store.nifEmpty")}</span>
                        ),
                      ],
                      [t("store.currency"), `${currency} (${store.currency})`],
                      [t("store.status"), t(`storeStatus.${store.status}`)],
                    ]}
                  />
                </Panel>
                <div className="mt-6">
                  <Panel title={t("support.title")} subtitle={t("support.subtitle")}>
                    <StoreSupportForm initial={{ whatsapp: store.supportWhatsapp, email: store.supportEmail }} canEdit={session!.role === "owner"} />
                  </Panel>
                </div>
              </div>
            ),
            integrations: (
              <div className="max-w-2xl">
                <Panel title={t("integrations.title")} subtitle={t("integrations.subtitle")}>
                  <MetaPixelForm initial={store.metaPixelId} canEdit={session!.role === "owner"} />
                </Panel>
                <div className="mt-6">
                  <Panel title={t("notifications.title")} subtitle={t("notifications.subtitle")}>
                    <NotificationsForm initialWhatsapp={store.notifyWhatsapp} canEdit={session!.role === "owner"} />
                  </Panel>
                </div>
              </div>
            ),
            bank: (
              <div className="max-w-2xl">
                <Panel title={t("bank.title")} subtitle={t("bank.subtitle")}>
                  <BankAccountForm initial={bank} canEdit={session!.role === "owner"} />
                </Panel>
              </div>
            ),
          }}
        />
      </div>
    </PageTransition>
  );
}
