import type { ReactNode } from "react";

/** Signed change with a drawn chevron (not a text glyph). Sign + colour + shape: never colour alone. */
export function Delta({ pct, children }: { pct: number; children: ReactNode }) {
  const tone = pct < 0 ? "text-down" : pct > 0 ? "text-up" : "text-ink-2";

  return (
    <span className={`inline-flex items-center gap-1 font-medium tabular-nums ${tone}`}>
      <svg
        aria-hidden
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {pct === 0 ? (
          <path d="M2 5h6" />
        ) : (
          <path d={pct > 0 ? "M2 6.5 5 3.5l3 3" : "M2 3.5l3 3 3-3"} />
        )}
      </svg>
      {children}
    </span>
  );
}
