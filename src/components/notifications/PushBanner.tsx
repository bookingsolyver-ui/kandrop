"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { usePush } from "./usePush";

const DISMISS_KEY = "kandrop:push-banner-dismissed";
const DISMISS_DAYS = 7;

/**
 * A visible banner at the top of the dashboard to turn on sale alerts on this device. It reads the browser's support and
 * permission (pending / granted / blocked), asks for the permission on click, sends the subscription to the backend and
 * says so right away. Shown only while there is something to do: nothing when push is unavailable or already on (it
 * confirms once, right after enabling). "Agora não" hides it for a week.
 */
export function PushBanner() {
  const t = useTranslations("Notifications.push.banner");
  const { state, enable, justEnabled } = usePush("merchant");
  const [dismissed, setDismissed] = useState(true); // hidden until we have looked: no flash, no mismatch
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let hidden = false;
    try {
      const at = Number(window.localStorage.getItem(DISMISS_KEY) ?? 0);
      hidden = at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000;
    } catch {
      /* storage blocked: show it */
    }
    const id = window.setTimeout(() => setDismissed(hidden), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!justEnabled) return;
    const show = window.setTimeout(() => setConfirmed(true), 0);
    const hide = window.setTimeout(() => setConfirmed(false), 6000);
    return () => { window.clearTimeout(show); window.clearTimeout(hide); };
  }, [justEnabled]);

  function later() {
    try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setDismissed(true);
  }

  const bell = <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>;

  if (confirmed) {
    return (
      <div role="status" className="flex items-center justify-center gap-2 bg-[var(--kai-success-bg)] px-4 py-2.5 text-[13px] font-semibold text-[var(--kai-success)]">
        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.2 4.2L19 7" /></svg>
        {t("success")}
      </div>
    );
  }
  if (state === "failed") {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-center gap-3 bg-[var(--kai-danger-bg)] px-4 py-2.5 text-[13px] font-semibold text-[var(--kai-danger)]">
        {t("failed")}
        <button type="button" onClick={() => void enable()} className="rounded-full border border-current px-3 py-1 text-[12px]">{t("retry")}</button>
      </div>
    );
  }
  if (state === "denied") {
    if (dismissed) return null;
    return (
      <div role="status" className="flex flex-wrap items-center justify-center gap-3 bg-[var(--kai-warn-bg)] px-4 py-2.5 text-[13px] font-semibold text-[var(--kai-warn)]">
        {t("denied")}
        <button type="button" onClick={later} className="rounded-full border border-current px-3 py-1 text-[12px]">{t("later")}</button>
      </div>
    );
  }
  if ((state !== "idle" && state !== "working") || dismissed) return null;
  return (
    <div role="region" aria-label={t("title")} className="flex flex-wrap items-center gap-3 border-b border-[var(--ink-200)] bg-[var(--kai-orange-50)] px-4 py-3 sm:px-8">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-[var(--kai-orange-600)]">{bell}</span>
      <div className="min-w-[12rem] flex-1 basis-[12rem]">
        <p className="text-sm font-bold text-[var(--ink-900)]">{t("title")}</p>
        <p className="text-[13px] text-[var(--ink-600)]">{t("body")}</p>
      </div>
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <button type="button" onClick={() => void enable()} disabled={state === "working"} className="h-10 rounded-full bg-brand-orange px-5 text-sm font-bold text-brand-black disabled:opacity-60">{state === "working" ? t("working") : t("enable")}</button>
        <button type="button" onClick={later} className="h-10 rounded-full px-3 text-sm font-semibold text-[var(--ink-600)] hover:text-[var(--ink-900)]">{t("later")}</button>
      </div>
    </div>
  );
}
