"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { BellIcon } from "./icons";

/** The bell: opens a small panel under it (product alerts). Closes on Esc or a click outside. */
export function NotificationsPopover({ className }: { className: string }) {
  const t = useTranslations("Kai.header");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        title={t("alerts")}
        aria-label={t("alerts")}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={className}
      >
        <BellIcon size={16} />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={t("notifications.title")}
          className="absolute top-full right-0 z-50 mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-0)] p-4 shadow-[var(--sh-md)]"
        >
          <p className="text-[10.5px] font-bold tracking-[0.08em] text-[var(--ink-500)] uppercase">
            {t("notifications.title")}
          </p>
          <div className="mt-3 flex flex-col items-center gap-1 py-4 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-[var(--ink-100)] text-[var(--ink-500)]">
              <BellIcon size={18} />
            </span>
            <p className="mt-2 text-[14px] font-semibold text-[var(--ink-900)]">
              {t("notifications.emptyTitle")}
            </p>
            <p className="text-[12px] leading-snug text-[var(--ink-500)]">
              {t("notifications.emptyBody")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
