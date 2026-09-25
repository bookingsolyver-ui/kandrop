"use client";

import { useState } from "react";
import { ChevronIcon } from "./icons";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

/**
 * Questions that open and close (one at a time). Each header is a real button with
 * `aria-expanded` / `aria-controls`, so it works with the keyboard (Enter, Space) and screen readers;
 * a closed answer is `hidden`, not just visually collapsed.
 */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="divide-y divide-line">
      {items.map((item) => {
        const expanded = open === item.id;
        const panel = `faq-panel-${item.id}`;
        return (
          <div key={item.id}>
            <h3>
              <button
                type="button"
                id={`faq-${item.id}`}
                aria-expanded={expanded}
                aria-controls={panel}
                onClick={() => setOpen(expanded ? null : item.id)}
                className="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left text-[15px] font-medium hover:text-accent"
              >
                {item.question}
                <span
                  className={`shrink-0 text-ink-muted transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
                >
                  <ChevronIcon />
                </span>
              </button>
            </h3>
            <div
              id={panel}
              role="region"
              aria-labelledby={`faq-${item.id}`}
              hidden={!expanded}
              className="pb-5 text-[14px] leading-relaxed text-ink-2"
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
