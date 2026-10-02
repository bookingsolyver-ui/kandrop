"use client";

import { useTranslations } from "next-intl";
import { useLogout } from "@/components/auth/useLogout";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { KandropLogo } from "@/components/receipt/KandropLogo";

/**
 * Where a switched-off account lands (the period ran out, or the team switched it off): no plans to pick, because paying
 * online does not turn the account back on — the team does, after the payment. Shows how to reach them.
 */
export function SuspendedNotice({ email, contactHref, contactLabel }: { email: string; contactHref: string | null; contactLabel: string | null }) {
  const t = useTranslations("Subscribe.suspended");
  const { logout, pending } = useLogout();
  return (
    <div className="marketing min-h-screen bg-page text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center gap-4 px-4 py-3 sm:px-6">
          <div className="mr-auto"><KandropLogo /></div>
          <LocaleSwitcher />
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-16 sm:px-6 sm:py-24">
        <p className="text-[11px] font-bold tracking-[0.18em] text-accent uppercase">{t("eyebrow")}</p>
        <h1 className="mt-3 font-serif text-[clamp(1.875rem,4vw,2.5rem)] leading-[1.1] tracking-[-0.02em]">{t("title")}</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2">{t("body", { email })}</p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{t("how")}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {contactHref && (
            <a href={contactHref} target={contactHref.startsWith("https") ? "_blank" : undefined} rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center rounded-md bg-action px-6 text-[15px] font-semibold text-on-action hover:opacity-90">
              {contactLabel ?? t("contact")}
            </a>
          )}
          <button type="button" onClick={logout} disabled={pending} className="inline-flex h-12 items-center justify-center rounded-md border border-line px-6 text-[15px] font-semibold hover:border-field disabled:opacity-60">
            {t("logout")}
          </button>
        </div>
      </main>
    </div>
  );
}
