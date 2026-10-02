"use client";

import { useTranslations } from "next-intl";
import { useLogout } from "@/components/auth/useLogout";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { KandropLogo } from "@/components/receipt/KandropLogo";
import type { PlanKey } from "@/server/modules/plan/limits";
import { BankDetails, type BankDetailsData } from "./BankDetails";

/** Where a merchant lands after asking for a plan: the dashboard stays closed until the team confirms the payment and approves. */
export function PendingApproval({ email, plan, transfer, contactHref }: { email: string; plan: PlanKey; transfer: BankDetailsData | null; contactHref: string | null }) {
  const t = useTranslations("Subscribe.pending");
  const names = useTranslations("Shell.plan.names");
  const { logout, pending } = useLogout();
  return (
    <div className="marketing min-h-screen bg-page text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center gap-4 px-4 py-3 sm:px-6">
          <div className="mr-auto"><KandropLogo /></div>
          <p className="hidden min-w-0 truncate text-[13px] text-ink-muted md:block">{t("signedIn", { email })}</p>
          <LocaleSwitcher />
        </div>
      </header>
      <main id="conteudo" className="mx-auto max-w-xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="text-[11px] font-bold tracking-[0.18em] text-accent uppercase">{t("eyebrow")}</p>
        <h1 role="status" className="mt-3 font-serif text-[clamp(1.75rem,4vw,2.25rem)] leading-[1.15] tracking-[-0.02em]">{t("title", { plan: names(plan) })}</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2">{t("body", { plan: names(plan) })}</p>
        {transfer && <div className="mt-6"><BankDetails info={transfer} /></div>}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {contactHref && (
            <a href={contactHref} target={contactHref.startsWith("https") ? "_blank" : undefined} rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center rounded-md bg-action px-6 text-[15px] font-semibold text-on-action hover:opacity-90">
              {t("sendProof")}
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
