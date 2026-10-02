"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "./ui";

const field = "mt-1.5 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20";

interface SendResult { configured: boolean; recipients: number; sent: number; failed: number }

/** "Send maintenance notice": a button, and a dialog to fill in what the e-mail says before it goes to every merchant. */
export function MaintenanceNotice() {
  const t = useTranslations("Admin.subscriptions.maintenance");
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [duration, setDuration] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const valid = reason.trim().length >= 3 && (startsAt !== "" || duration.trim() !== "") && (!startsAt || !endsAt || endsAt > startsAt);

  const send = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/notifications/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reason.trim(),
          ...(startsAt ? { startsAt } : {}),
          ...(endsAt ? { endsAt } : {}),
          ...(duration.trim() ? { duration: duration.trim() } : {}),
          includeInactive,
        }),
      });
      if (!res.ok) return void toast({ message: t("failed") });
      const out = ((await res.json()) as { data: SendResult }).data;
      if (!out.configured) toast({ message: t("notConfigured") });
      else if (out.recipients === 0) toast({ message: t("nobody") });
      else toast({ message: t(out.failed > 0 ? "donePartial" : "done", { sent: out.sent, total: out.recipients }) });
      if (out.configured && out.sent > 0) setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 items-center rounded-full border border-[var(--ink-200)] bg-white px-4 text-[13px] font-semibold text-[var(--ink-900)] hover:border-[var(--ink-300)]">
        {t("open")}
      </button>
      <Modal open={open} onClose={() => !busy && setOpen(false)} title={t("title")}>
        <p className="text-[13px] text-[var(--ink-600)]">{t("intro")}</p>
        <div className="mt-4 space-y-4">
          <label className="block text-[13px] font-semibold">
            {t("reason")}
            <input type="text" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder={t("reasonPlaceholder")} className={field} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-[13px] font-semibold">
              {t("starts")}
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={field} />
            </label>
            <label className="block text-[13px] font-semibold">
              {t("ends")}
              <input type="datetime-local" value={endsAt} min={startsAt || undefined} onChange={(e) => setEndsAt(e.target.value)} className={field} />
            </label>
          </div>
          <p className="-mt-2 text-[12px] text-[var(--ink-500)]">{t("clock")}</p>
          <label className="block text-[13px] font-semibold">
            {t("duration")}
            <input type="text" value={duration} maxLength={60} onChange={(e) => setDuration(e.target.value)} placeholder={t("durationPlaceholder")} className={field} />
          </label>
          <label className="flex items-start gap-2.5 text-[13px] text-[var(--ink-700)]">
            <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} className="mt-0.5 size-4" />
            <span>{t("includeInactive")}</span>
          </label>
        </div>
        <p className="mt-4 rounded-xl bg-[var(--kai-warn-bg)] px-3.5 py-2.5 text-[13px] text-[var(--kai-warn)]">{t("warning")}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={() => setOpen(false)} className="inline-flex h-10 items-center rounded-full border border-[var(--ink-200)] bg-white px-4 text-[13px] font-semibold disabled:opacity-50">{t("cancel")}</button>
          <button type="button" disabled={busy || !valid} onClick={send} className="inline-flex h-10 items-center rounded-full bg-[var(--ink-900)] px-5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50">
            {busy ? t("sending") : t("send")}
          </button>
        </div>
      </Modal>
    </>
  );
}
