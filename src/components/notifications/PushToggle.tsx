"use client";

import { useTranslations } from "next-intl";
import { usePush } from "./usePush";

/**
 * "Ativar Notificações no Dispositivo": the compact/inline control (settings, admin header). Hidden when push is not
 * configured or not supported. The big dashboard banner is `PushBanner`.
 */
export function PushToggle({ scope, compact = false }: { scope: "merchant" | "admin"; compact?: boolean }) {
  const t = useTranslations("Notifications.push");
  const { state, enable } = usePush(scope);

  if (state === "checking" || state === "unsupported") return null;
  const button = "inline-flex items-center gap-2 rounded-full font-semibold transition-colors disabled:opacity-60";
  return (
    <div className={compact ? "" : "space-y-2"}>
      {state === "on" ? (
        <p className={`${button} ${compact ? "h-9 border border-[var(--ink-200)] bg-white px-3 text-[13px] text-[var(--kai-success)]" : "text-sm text-up"}`} role="status">
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.2 4.2L19 7" /></svg>
          {t("on")}
        </p>
      ) : (
        <button type="button" onClick={() => void enable()} disabled={state === "working" || state === "denied"} className={`${button} ${compact ? "h-9 border border-[var(--ink-200)] bg-white px-3 text-[13px] text-[var(--ink-900)] hover:border-[var(--ink-300)]" : "h-12 bg-action px-6 text-[0.9375rem] text-on-action hover:opacity-90"}`}>
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
          {state === "working" ? t("working") : t("enable")}
        </button>
      )}
      {!compact && state === "denied" && <p role="alert" className="text-[13px] text-down">{t("denied")}</p>}
      {!compact && state === "failed" && <p role="alert" className="text-[13px] text-down">{t("failed")}</p>}
    </div>
  );
}
