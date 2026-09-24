"use client";

import { useTranslations } from "next-intl";
import { useRef, type KeyboardEvent } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { ORDER_STATUSES, type OrderStatus } from "@/shared/orders/schemas";

export type StatusFilter = OrderStatus | "all";
const TABS: StatusFilter[] = ["all", ...ORDER_STATUSES];

export const tabId = (value: StatusFilter) => `orders-tab-${value}`;
export const PANEL_ID = "orders-panel";

/**
 * Status filter as real tabs (one tabpanel: the table): arrow keys move between them, Home/End
 * jump, and only the selected tab is in the Tab order. Counts respect the current search.
 */
export function StatusTabs({
  value,
  counts,
  onChange,
}: {
  value: StatusFilter;
  counts: Partial<Record<StatusFilter, number>> | undefined;
  onChange: (value: StatusFilter) => void;
}) {
  const t = useTranslations("Orders");
  const f = useFormatters();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(event: KeyboardEvent, index: number) {
    const move = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    const target =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? TABS.length - 1
          : move !== undefined
            ? (index + move + TABS.length) % TABS.length
            : null;
    if (target === null) return;
    event.preventDefault();
    const next = TABS[target]!;
    onChange(next);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={t("tabs.label")}
      className="-mx-4 flex overflow-x-auto border-b border-line px-4 sm:-mx-6 sm:px-6"
    >
      {TABS.map((tab, index) => {
        const selected = tab === value;
        const count = counts?.[tab];
        return (
          <button
            key={tab}
            ref={(el) => {
              refs.current[tab] = el;
            }}
            id={tabId(tab)}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={PANEL_ID}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={`-mb-px inline-flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-sm whitespace-nowrap first:pl-0 ${
              selected
                ? "border-ink font-medium text-ink"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {tab === "all" ? t("tabs.all") : t(`status.${tab}`)}
            <span className="text-[13px] font-normal text-ink-muted tabular-nums">
              {count === undefined ? "" : f.integer(count)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
