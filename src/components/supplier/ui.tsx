import type { ReactNode } from "react";

/**
 * The supplier portal's own building blocks, so its three pages share one rhythm: a quiet white
 * surface with a hairline border and a soft shadow, generous padding and a calm type scale.
 */
export const panel = "rounded-2xl border border-[var(--ink-200)] bg-white shadow-[0_1px_2px_rgba(16,16,24,0.04),0_8px_24px_-12px_rgba(16,16,24,0.08)]";

/** Table header cell, table body cell: same horizontal rhythm as the panel's own padding. */
export const th = "px-5 py-3 text-[11px] font-semibold tracking-[0.07em] text-[var(--ink-500)] uppercase";
export const td = "px-5 py-4";

/** Inputs: clean border, soft focus ring in the brand colour. */
export const inputClass =
  "h-11 w-full rounded-xl border border-[var(--ink-200)] bg-white px-3.5 text-sm text-[var(--ink-900)] shadow-xs outline-none transition placeholder:text-[var(--ink-400,var(--ink-500))] hover:border-[var(--ink-300)] focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/15";
export const labelClass = "text-xs font-semibold tracking-wide text-[var(--ink-700)] uppercase";

export function SupplierPageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="text-2xl leading-tight font-bold tracking-tight break-words text-[var(--ink-900)] sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--ink-600)] sm:text-[15px]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

const BUBBLE = {
  default: "bg-[var(--kai-orange-50)] text-[var(--kai-orange-600)]",
  warn: "bg-[var(--kai-warn-bg)] text-[var(--kai-warn)]",
  danger: "bg-[var(--kai-danger-bg)] text-[var(--kai-danger)]",
} as const;

/** A headline number: icon on the left in a soft tile, label, value, one line of context. */
export function SupplierStat({ label, value, note, icon, tone = "default" }: { label: string; value: ReactNode; note?: string; icon: ReactNode; tone?: keyof typeof BUBBLE }) {
  return (
    <div className={`${panel} flex items-start gap-4 p-5 transition-shadow hover:shadow-[0_1px_2px_rgba(16,16,24,0.05),0_14px_32px_-14px_rgba(16,16,24,0.14)]`}>
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${BUBBLE[tone]}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug text-[var(--ink-600)] sm:min-h-[2.6em]">{label}</p>
        <p className="mono-num mt-1.5 text-[22px] leading-none font-extrabold tracking-tight whitespace-nowrap text-[var(--ink-900)]">{value}</p>
        {note && <p className="mt-2 text-[12px] leading-snug text-[var(--ink-500)]">{note}</p>}
      </div>
    </div>
  );
}

/** A titled section of the page (a card with a header row). */
export function Section({ title, aside, children, className = "" }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`${panel} overflow-hidden ${className}`}>
      <div className="flex items-center justify-between gap-4 border-b border-[var(--ink-200)] px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold tracking-tight text-[var(--ink-900)]">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export const EmptyState = ({ children }: { children: ReactNode }) => (
  <p className="px-6 py-14 text-center text-sm text-[var(--ink-500)]">{children}</p>
);
