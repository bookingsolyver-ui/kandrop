"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { DELIVERY_WINDOW_DAYS, isDeliverableDay, isSunday, luandaToday, toIsoDay } from "@/shared/fulfilment/deliveryDate";

const DAY = 86_400_000;

/**
 * A small calendar for the delivery day: Sundays (and every day outside tomorrow..30 days) are disabled and cannot be
 * picked. The chosen day travels as a hidden `YYYY-MM-DD` field of the checkout form; the server checks the same rules.
 */
export function DeliveryDatePicker({ id, name, value, onChange, onBlur, invalid: _invalid, className }: { id: string; name: string; value: string; onChange: (iso: string) => void; onBlur?: () => void; invalid: boolean; className: string }) {
  const t = useTranslations("QuickCheckout.fields");
  const locale = useLocale();
  const panel = useId();
  const [open, setOpen] = useState(false);
  const today = luandaToday();
  const first = today + DAY;
  const last = today + DELIVERY_WINDOW_DAYS * DAY;
  const [month, setMonth] = useState(() => { const d = new Date(first); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1); });

  const fmt = useMemo(() => ({
    day: new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
    month: new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }),
    weekday: new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }),
  }), [locale]);

  // Monday-first grid: the 7 weekday labels, then the days of the month with leading blanks.
  const monday = Date.UTC(2024, 0, 1);
  const labels = Array.from({ length: 7 }, (_, i) => fmt.weekday.format(monday + i * DAY));
  const start = new Date(month);
  const lead = (start.getUTCDay() + 6) % 7;
  const total = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  const cells = [...Array.from({ length: lead }, () => null), ...Array.from({ length: total }, (_, i) => month + i * DAY)];
  const prevOk = month > Date.UTC(new Date(first).getUTCFullYear(), new Date(first).getUTCMonth(), 1);
  const nextOk = Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1) <= last;
  const shift = (delta: number) => setMonth(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + delta, 1));
  const label = value ? fmt.day.format(Date.parse(`${value}T00:00:00Z`)) : t("datePlaceholder");

  return (
    <div onBlur={onBlur}>
      <input type="hidden" name={name} value={value} />
      <button type="button" id={id} aria-expanded={open} aria-controls={panel} onClick={() => setOpen((o) => !o)} className={`${className} flex items-center justify-between gap-3 text-left ${value ? "" : "text-ink-muted/70"}`}>
        <span className="truncate first-letter:uppercase">{label}</span>
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-muted"><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M8 3v4M16 3v4M3.5 10h17" /></svg>
      </button>
      {open && (
        <div id={panel} className="mt-2 rounded-xl border border-line bg-surface p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <button type="button" aria-label={t("prevMonth")} disabled={!prevOk} onClick={() => shift(-1)} className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-page disabled:opacity-30">‹</button>
            <p className="text-sm font-bold first-letter:uppercase">{fmt.month.format(month)}</p>
            <button type="button" aria-label={t("nextMonth")} disabled={!nextOk} onClick={() => shift(1)} className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-page disabled:opacity-30">›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-ink-muted uppercase">{labels.map((l, i) => <span key={i} className="py-1">{l}</span>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((c, i) => {
              if (c === null) return <span key={`b${i}`} />;
              const ok = isDeliverableDay(c);
              const iso = toIsoDay(c);
              const selected = iso === value;
              return (
                <button key={iso} type="button" disabled={!ok} aria-pressed={selected} aria-label={`${fmt.day.format(c)}${isSunday(c) ? ` — ${t("sundayOff")}` : ""}`} title={isSunday(c) ? t("sundayOff") : undefined}
                  onClick={() => { onChange(iso); setOpen(false); }}
                  className={`h-10 rounded-lg text-sm tabular-nums transition-colors ${selected ? "bg-action font-bold text-on-action" : ok ? "font-medium hover:bg-page" : "cursor-not-allowed text-ink-muted/40 line-through decoration-ink-muted/30"}`}>
                  {new Date(c).getUTCDate()}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[12px] text-ink-muted">{t("dateHint")}</p>
        </div>
      )}
    </div>
  );
}
