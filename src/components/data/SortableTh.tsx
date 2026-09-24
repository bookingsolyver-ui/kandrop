"use client";

import { SortIcon } from "./icons";

export interface SortState<C extends string> {
  by: C;
  dir: "asc" | "desc";
}

/** Small-caps header style shared by every data table. */
export const TH = "text-[11px] font-medium tracking-[0.14em] uppercase text-ink-muted";

/** A column header that is also the sort control; `aria-sort` tells assistive tech the state. */
export function SortableTh<C extends string>({
  column,
  label,
  ariaLabel,
  sort,
  onSort,
  className = "",
}: {
  column: C;
  label: string;
  /** Translated "Sort by {label}". It contains the visible label, as WCAG 2.5.3 asks. */
  ariaLabel: string;
  sort: SortState<string>;
  onSort: (column: C) => void;
  className?: string;
}) {
  const active = sort.by === column;
  const align = className.includes("text-right") ? "justify-end" : "";
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
      className={`${TH} ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        aria-label={ariaLabel}
        className={`-mx-1 inline-flex min-h-11 w-full items-center gap-1.5 rounded px-1 uppercase hover:text-ink ${align} ${active ? "text-ink" : ""}`}
      >
        {label}
        <SortIcon dir={active ? sort.dir : null} />
      </button>
    </th>
  );
}
