"use client";

import { CloseIcon } from "@/components/data/icons";
import { CheckCircleIcon } from "./icons";

/**
 * A short notice pinned to the corner (bottom of the screen on a phone). The `role="status"` region
 * is always in the page, so screen readers announce what appears in it; it is dismissible, and the
 * owner closes it by itself after a few seconds.
 */
export function Toast({
  title,
  body,
  closeLabel,
  onClose,
}: {
  title?: string;
  body?: string;
  closeLabel: string;
  onClose: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[24rem]"
    >
      {title && (
        <div className="pointer-events-auto flex items-start gap-3 rounded-lg border border-accent/60 bg-surface p-4 shadow-lg">
          <span className="mt-0.5 text-accent">
            <CheckCircleIcon />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{title}</p>
            {body && <p className="mt-1 text-[13px] leading-snug text-ink-2">{body}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-md text-ink-2 hover:text-ink"
          >
            <CloseIcon />
          </button>
        </div>
      )}
    </div>
  );
}
