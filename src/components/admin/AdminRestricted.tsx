"use client";

import { useTranslations } from "next-intl";
import { useLogout } from "@/components/auth/useLogout";
import { BrandLink } from "@/components/ui/BrandButton";

/** Shown to a signed-in person whose e-mail is not in `ADMIN_EMAILS`. It says nothing about who is. */
export function AdminRestricted() {
  const t = useTranslations("Admin.restricted");
  const { logout, pending } = useLogout("?next=/admin");
  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--ink-50)] px-4">
      <div role="alert" className="w-full max-w-md rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-8 text-center shadow-[var(--sh-md)]">
        <span aria-hidden className="mx-auto grid size-14 place-items-center rounded-full bg-[var(--kai-danger-bg)] text-[var(--kai-danger)]">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-[var(--ink-900)]">{t("title")}</h1>
        <p className="mt-2 text-[15px] text-[var(--ink-600)]">{t("body")}</p>
        <div className="mt-7 flex flex-col gap-3">
          <BrandLink href="/dashboard" className="h-12 w-full text-sm">{t("back")}</BrandLink>
          <button type="button" onClick={logout} disabled={pending} className="h-12 w-full rounded-full border border-[var(--ink-200)] bg-white text-sm font-semibold text-[var(--ink-900)] hover:border-[var(--ink-300)] disabled:opacity-60">{t("switch")}</button>
        </div>
      </div>
    </main>
  );
}
