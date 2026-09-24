"use client";

import { useRef, type KeyboardEvent } from "react";

export const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`;
export const panelId = (prefix: string, id: string) => `${prefix}-panel-${id}`;

/**
 * Tabs (WAI-ARIA tablist): arrow keys move and select, Home/End jump, and only the selected tab
 * is in the Tab order. The caller renders the `tabpanel`s with `panelId` / `tabId`.
 */
export function Tabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
  idPrefix,
}: {
  label: string;
  tabs: Array<{ id: T; label: string; count?: number }>;
  value: T;
  onChange: (value: T) => void;
  idPrefix: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(event: KeyboardEvent, index: number) {
    const move = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    const target =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : move !== undefined
            ? (index + move + tabs.length) % tabs.length
            : null;
    if (target === null) return;
    event.preventDefault();
    const next = tabs[target]!.id;
    onChange(next);
    refs.current[next]?.focus();
  }

  return (
    <div role="tablist" aria-label={label} className="flex overflow-x-auto border-b border-line">
      {tabs.map((tab, index) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[tab.id] = el;
            }}
            id={tabId(idPrefix, tab.id)}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={panelId(idPrefix, tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={`-mb-px inline-flex min-h-12 shrink-0 items-center border-b-2 px-4 text-sm whitespace-nowrap first:pl-0 ${
              selected
                ? "border-ink font-medium text-ink"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-2 text-[13px] font-normal text-ink-muted tabular-nums">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
