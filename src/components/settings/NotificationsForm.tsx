"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { saveNotifyWhatsappAction } from "@/app/[locale]/dashboard/settings/pushActions";
import { PushToggle } from "@/components/notifications/PushToggle";

/** Sale alerts for the merchant: this device (Web Push) and, optionally, their WhatsApp number. */
export function NotificationsForm({ initialWhatsapp, canEdit }: { initialWhatsapp: string | null; canEdit: boolean }) {
  const t = useTranslations("Settings.notifications");
  const [value, setValue] = useState(initialWhatsapp ?? "");
  const [status, setStatus] = useState<"idle" | "saved" | "invalid" | "failed">("idle");
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("idle");
    start(async () => {
      const result = await saveNotifyWhatsappAction(value);
      setStatus(result.ok ? "saved" : result.error === "invalid" ? "invalid" : "failed");
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold">{t("device.title")}</h3>
        <p className="mt-1 mb-3 text-[13px] text-ink-muted">{t("device.body")}</p>
        <PushToggle scope="merchant" />
      </div>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="notify-wa" className="mb-2 block text-sm font-medium text-ink">{t("whatsapp.label")}</label>
          <input id="notify-wa" value={value} onChange={(e) => setValue(e.target.value)} disabled={!canEdit} inputMode="numeric" autoComplete="tel-national" maxLength={13} placeholder="923 000 000" aria-invalid={status === "invalid"}
            className="h-12 w-full rounded-md border border-field bg-surface px-3.5 text-[0.9375rem] text-ink tabular-nums outline-none focus-visible:border-action focus-visible:ring-4 focus-visible:ring-action/20 disabled:opacity-60" />
          <p className={`mt-2 text-[13px] ${status === "invalid" ? "text-down" : "text-ink-muted"}`} role={status === "invalid" ? "alert" : undefined}>{status === "invalid" ? t("whatsapp.invalid") : t("whatsapp.hint")}</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-4">
            <button type="submit" disabled={pending} className="h-12 rounded-md bg-action px-7 text-[0.9375rem] font-semibold text-on-action hover:opacity-90 disabled:opacity-60">{pending ? t("whatsapp.saving") : t("whatsapp.save")}</button>
            <p role="status" className={`text-sm ${status === "failed" ? "text-down" : "text-up"} empty:hidden`}>{status === "saved" ? t("whatsapp.saved") : status === "failed" ? t("whatsapp.failed") : ""}</p>
          </div>
        )}
      </form>
    </div>
  );
}
