"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useLogout } from "@/components/auth/useLogout";
import { Link } from "@/i18n/navigation";
import { LogoutIcon, SettingsIcon } from "./icons";

const initials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0]![0], parts[parts.length - 1]![0]] : [parts[0]?.[0]];
  return letters.join("").toUpperCase() || "?";
};

/**
 * Avatar button + account menu (WAI-ARIA menu button): opens with Enter/Space/click, arrows
 * move between items, Esc closes and returns focus, and a click or Tab outside closes it.
 */
export function UserMenu({ name, email }: { name: string; email: string }) {
  const t = useTranslations("Shell.user");
  const auth = useTranslations("Auth");
  const { logout, pending } = useLogout();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const items = () => [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];

  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const away = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menu.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent) {
    const all = items();
    const index = all.indexOf(document.activeElement as HTMLElement);
    const focusAt = (i: number) => {
      e.preventDefault();
      all[(i + all.length) % all.length]?.focus();
    };
    if (e.key === "ArrowDown") focusAt(index + 1);
    else if (e.key === "ArrowUp") focusAt(index - 1);
    else if (e.key === "Home") focusAt(0);
    else if (e.key === "End") focusAt(all.length - 1);
    else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "Tab") close(false);
  }

  const item =
    "flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm text-ink-2 hover:bg-page hover:text-ink focus-visible:bg-page";

  return (
    <div className="relative">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("open")}
        onClick={() => setOpen((v) => !v)}
        className="grid size-11 place-items-center rounded-full"
      >
        <span
          aria-hidden
          className="grid size-9 place-items-center rounded-full border border-field bg-page text-[13px] font-semibold tracking-wide text-ink"
        >
          {initials(name)}
        </span>
      </button>

      {open && (
        <div
          ref={menu}
          role="menu"
          aria-label={t("label")}
          onKeyDown={onKeyDown}
          className="absolute right-0 z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-surface p-1"
        >
          <div className="border-b border-line px-3 py-3">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-[13px] text-ink-muted">{email}</p>
          </div>
          <div className="pt-1">
            <Link
              href="/dashboard/settings"
              role="menuitem"
              tabIndex={-1}
              onClick={() => close(false)}
              className={item}
            >
              <SettingsIcon size={18} />
              {t("settings")}
            </Link>
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={logout}
              disabled={pending}
              className={`${item} disabled:opacity-60`}
            >
              <LogoutIcon />
              {auth("logout")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
