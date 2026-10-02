"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "./ui";

const field = "mt-1.5 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20";

interface SendResult { configured: boolean; recipients: number; sent: number; failed: number; skippedBanned: number; failures: Array<{ to: string; error: string }> }

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
  const [onlyActive, setOnlyActive] = useState(false);
  const [report, setReport] = useState<SendResult | null>(null);

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
          onlyActive,
        }),
      });
      if (!res.ok) return void toast({ message: t("failed") });
      const out = ((await res.json()) as { data: SendResult }).data;
      if (!out.configured) toast({ message: t("notConfigured") });
      else if (out.recipients === 0) toast({ message: t("nobody") });
      else toast({ message: t(out.failed > 0 ? "donePartial" : "done", { sent: out.sent, total: out.recipients }) });
      if (out.configured && out.recipients > 0) setReport(out);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 items-center rounded-full border border-[var(--ink-200)] bg-white px-4 text-[13px] font-semibold text-[var(--ink-900)] hover:border-[var(--ink-300)]">
        {t("open")}
      </button>
      <Modal open={open} onClose={() => { if (!busy) { setOpen(false); setReport(null); } }} title={t("title")}>
      {report ? (
        <div>
          <p className="text-[15px] font-semibold text-[var(--ink-900)]">{t("reportTotals", { sent: report.sent, failed: report.failed, total: report.recipients })}</p>
          {report.skippedBanned > 0 && <p className="mt-1 text-[13px] text-[var(--ink-600)]">{t("reportBanned", { count: report.skippedBanned })}</p>}
          {report.failures.length > 0 && (
            <>
              <p className="mt-4 text-[13px] font-semibold">{t("reportFailures")}</p>
              <ul className="mt-2 max-h-48 divide-y divide-[var(--ink-100)] overflow-y-auto rounded-xl border border-[var(--ink-200)] text-[13px]">
                {report.failures.map((f) => (
                  <li key={f.to} className="flex justify-between gap-3 px-3 py-2"><span className="truncate">{f.to}</span><span className="shrink-0 text-[var(--ink-500)]">{f.error}</span></li>
                ))}
              </ul>
            </>
          )}
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={() => { setOpen(false); setReport(null); }} className="inline-flex h-10 items-center rounded-full bg-[var(--ink-900)] px-5 text-[13px] font-semibold text-white hover:opacity-90">{t("close")}</button>
          </div>
        </div>
      ) : (
      <>
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
            <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} className="mt-0.5 size-4" />
            <span>{t("onlyActive")}</span>
          </label>
        </div>
        <p className="mt-4 rounded-xl bg-[var(--kai-warn-bg)] px-3.5 py-2.5 text-[13px] text-[var(--kai-warn)]">{t("warning")}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={() => setOpen(false)} className="inline-flex h-10 items-center rounded-full border border-[var(--ink-200)] bg-white px-4 text-[13px] font-semibold disabled:opacity-50">{t("cancel")}</button>
          <button type="button" disabled={busy || !valid} onClick={send} className="inline-flex h-10 items-center rounded-full bg-[var(--ink-900)] px-5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50">
            {busy ? t("sending") : t("send")}
          </button>
        </div>
      </>
      )}
      </Modal>
    </>
  );
}
