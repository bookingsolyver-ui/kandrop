"use client";

import { useId, useState, type ReactElement, cloneElement } from "react";

/**
 * A small floating label for an icon button. Shown on hover AND on keyboard focus, hidden on leave/blur/Esc, and
 * wired to the button with `aria-describedby`, so it is announced to screen readers as well. It never captures the
 * pointer (the button under it stays clickable).
 */
export function Tooltip({ label, children }: { label: string; children: ReactElement<{ "aria-describedby"?: string }> }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
    >
      {cloneElement(children, { "aria-describedby": open ? id : undefined })}
      {open && (
        <span
          id={id}
          role="tooltip"
          className="animate-fade-in pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 w-max max-w-[15rem] -translate-x-1/2 rounded-lg bg-[var(--ink-900)] px-2.5 py-1.5 text-center text-[12px] leading-snug font-medium text-white shadow-[var(--sh-md)]"
        >
          {label}
          <span aria-hidden className="absolute top-full left-1/2 -mt-1 size-2 -translate-x-1/2 rotate-45 bg-[var(--ink-900)]" />
        </span>
      )}
    </span>
  );
}
