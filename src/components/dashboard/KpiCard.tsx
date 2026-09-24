import type { ReactNode } from "react";

/**
 * KPIs read as one statement, not four widgets: a single bordered strip divided by hairlines.
 * Each cell is a subgrid spanning three rows (label / value / note), so the three lines stay
 * aligned across cells even when a longer FR/PT label wraps.
 */
export function KpiStrip({ children }: { children: ReactNode }) {
  return (
    <section className="grid overflow-hidden rounded-lg border border-line bg-surface sm:grid-cols-2 xl:grid-cols-4">
      {children}
    </section>
  );
}

// Divider placement per cell index for 1 / 2 / 4 column layouts.
const DIVIDERS = [
  "",
  "border-t sm:border-t-0 sm:border-l",
  "border-t xl:border-t-0 xl:border-l",
  "border-t sm:border-l xl:border-t-0",
];

interface KpiCellProps {
  index: 0 | 1 | 2 | 3;
  label: string;
  /** The displayed value (may be styled parts). */
  value: ReactNode;
  /** Changes whenever the value changes; a new key replays the "settle" transition. */
  valueKey: string;
  /** Secondary lines: a delta, a margin, a pending amount… */
  hint: ReactNode;
  /** Only animate changes once live updates are flowing (never on first paint). */
  live: boolean;
  /** Brand-filled treatment reserved for the balance the merchant can withdraw. */
  emphasis?: boolean;
}

export function KpiCell({
  index,
  label,
  value,
  valueKey,
  hint,
  live,
  emphasis = false,
}: KpiCellProps) {
  return (
    <article
      className={`row-span-3 grid grid-rows-subgrid border-line p-6 sm:p-7 ${DIVIDERS[index]} ${
        emphasis ? "bg-brand text-on-brand" : ""
      }`}
    >
      <h3
        className={`text-[11px] leading-snug font-medium tracking-[0.14em] uppercase ${
          emphasis ? "text-on-brand-muted" : "text-ink-muted"
        }`}
      >
        {label}
      </h3>
      {/* Tabular figures: digits keep their width, so live changes never make the number jitter. */}
      <p className="mt-4 text-[2rem] leading-none font-medium tracking-tight tabular-nums">
        <span key={valueKey} className={live ? "settle" : undefined}>
          {value}
        </span>
      </p>
      <div
        className={`mt-4 space-y-1 text-[13px] leading-snug ${
          emphasis ? "text-on-brand-muted" : "text-ink-muted"
        }`}
      >
        {hint}
      </div>
    </article>
  );
}

export function KpiSkeleton() {
  return (
    <div
      aria-hidden
      className="h-[172px] animate-pulse rounded-lg border border-line bg-surface motion-reduce:animate-none"
    />
  );
}
