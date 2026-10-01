"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";

export const card = "rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-0)]";

/** A page title with its subtitle and, on the right, the page's actions. */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-900)] sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-[13px] text-[var(--ink-600)] sm:text-[15px]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** A metric card: icon, label, big value and a small note. */
export function StatCard({
  label,
  value,
  note,
  icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  note?: string;
  icon: ReactNode;
  tone?: "default" | "danger" | "warn";
}) {
  const bubble =
    tone === "danger"
      ? "bg-[var(--kai-danger-bg)] text-[var(--kai-danger)]"
      : tone === "warn"
        ? "bg-[var(--kai-warn-bg)] text-[var(--kai-warn)]"
        : "bg-[var(--kai-orange-50)] text-[var(--kai-orange-600)]";
  return (
    <div className={`${card} flex items-start gap-3.5 p-4 transition-all hover:-translate-y-px hover:shadow-[var(--sh-md)] sm:p-5`}>
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${bubble}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[var(--ink-600)]">{label}</p>
        <p className="mono-num mt-0.5 text-[18px] leading-tight font-extrabold tracking-tight whitespace-nowrap text-[var(--ink-900)] sm:text-[20px]">{value}</p>
        {note && <p className="mt-1 text-[12px] text-[var(--ink-500)]">{note}</p>}
      </div>
    </div>
  );
}

const TONES = {
  success: "bg-[var(--kai-success-bg)] text-[var(--kai-success)]",
  warn: "bg-[var(--kai-warn-bg)] text-[var(--kai-warn)]",
  danger: "bg-[var(--kai-danger-bg)] text-[var(--kai-danger)]",
  neutral: "bg-[var(--ink-100)] text-[var(--ink-600)]",
  brand: "bg-[var(--kai-orange-50)] text-[var(--kai-orange-600)]",
} as const;

export function Badge({ tone = "neutral", children, className = "" }: { tone?: keyof typeof TONES; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

/** The footer of a table: "Showing 1–10 of 36", rows per page and the pager. */
export function usePager<T>(rows: T[], initial = 10) {
  const [perPage, setPerPage] = useState(initial);
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  const current = Math.min(page, pages);
  const slice = rows.slice((current - 1) * perPage, current * perPage);
  return { slice, page: current, pages, perPage, setPage, setPerPage: (n: number) => { setPerPage(n); setPage(1); }, total: rows.length, from: rows.length === 0 ? 0 : (current - 1) * perPage + 1 };
}

export function Pager({ pager }: { pager: ReturnType<typeof usePager> }) {
  const t = useTranslations("Admin.table");
  if (pager.total === 0) return null;
  const btn = "h-8 rounded-full border border-[var(--ink-200)] bg-white px-3 text-[13px] font-semibold text-[var(--ink-700)] hover:border-[var(--ink-300)] disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ink-200)] px-5 py-3.5">
      <div className="flex flex-wrap items-center gap-3 text-[13px] text-[var(--ink-600)]">
        <span>{t("showing", { from: pager.from, to: pager.from + pager.slice.length - 1, total: pager.total })}</span>
        <label className="flex items-center gap-2">
          {t("perPage")}
          <select value={pager.perPage} onChange={(e) => pager.setPerPage(Number(e.target.value))} className="h-8 rounded-full border border-[var(--ink-200)] bg-white px-2.5 text-[13px] font-medium text-[var(--ink-900)]">
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>
      <nav aria-label={t("pagination")} className="flex items-center gap-1.5">
        <button type="button" className={btn} disabled={pager.page === 1} onClick={() => pager.setPage(pager.page - 1)}>{t("prev")}</button>
        <span className="mono-num px-2 text-[13px] font-semibold text-[var(--ink-900)]">{pager.page} / {pager.pages}</span>
        <button type="button" className={btn} disabled={pager.page === pager.pages} onClick={() => pager.setPage(pager.page + 1)}>{t("next")}</button>
      </nav>
    </div>
  );
}

/** A native `<dialog>` (focus trap, Esc, backdrop for free), opened by `open` and closed by `onClose`. */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-[var(--ink-200)] bg-white p-0 text-[var(--ink-900)] shadow-[var(--sh-md)] backdrop:bg-black/50"
    >
      {open && (
        <div className="p-6">
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <div className="mt-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}

/** Lower-cases and strips accents so searches ignore them. */
export const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export const dateTime = (ms: number, locale: string) =>
  new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(ms));
export const dateOnly = (ms: number, locale: string) =>
  new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(ms));
