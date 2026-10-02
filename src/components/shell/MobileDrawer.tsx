"use client";

import { useTranslations } from "next-intl";
import { useEffect, type RefObject } from "react";
import { useLogout } from "@/components/auth/useLogout";
import { KaiNav } from "@/components/kai/KaiNav";
import { GearIcon, LogOutIcon } from "@/components/kai/icons";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Link, usePathname } from "@/i18n/navigation";
import { CloseIcon } from "./icons";
import { PlanCard } from "./PlanCard";
import { Wordmark } from "./Wordmark";

const initials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0]![0], parts[parts.length - 1]![0]] : [parts[0]?.[0]];
  return letters.join("").toUpperCase() || "?";
};

/**
 * The sidebar on phones and tablets: a native `<dialog>` slid in from the left (focus trap, Esc
 * and backdrop for free). Its menu is the SAME `KaiNav` the desktop sidebar renders, so the links
 * look identical (rounded items, orange active state); it closes by itself when a link is followed
 * or the screen grows to desktop width. The language selector and the account live here because the
 * header has no room for them.
 */
export function MobileDrawer({
  dialogRef,
  storeName,
  user,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  storeName: string;
  user: { name: string; email: string };
}) {
  const t = useTranslations("Shell");
  const auth = useTranslations("Auth");
  const pathname = usePathname();
  const { logout, pending } = useLogout();

  // Following a link changes the path; a link to the current page is handled by `onNavigate`.
  useEffect(() => dialogRef.current?.close(), [pathname, dialogRef]);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const onChange = () => query.matches && dialogRef.current?.close();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [dialogRef]);

  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      aria-label={t("navLabel")}
      onClick={(e) => e.target === dialogRef.current && close()}
      className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-72 max-w-[85vw] overflow-hidden border-r border-[var(--ink-200)] bg-[var(--ink-0)] p-0 text-[var(--ink-900)] backdrop:bg-black/50 lg:hidden"
    >
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--ink-200)] p-4">
          <Wordmark onNavigate={close} />
          <button
            type="button"
            onClick={close}
            aria-label={t("closeMenu")}
            className="grid size-10 place-items-center rounded-full border border-[var(--ink-200)] bg-white text-[var(--ink-700)] hover:text-[var(--ink-900)]"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* The signed-in merchant's own store, under the brand: a card of its own, so the name never touches the logo or the menu and a long name wraps instead of being cut. */}
          <div className="mx-4 mt-4 mb-3 flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--ink-200)] bg-[var(--ink-50)] p-3">
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-orange text-base font-extrabold text-brand-black">
              {(storeName.trim()[0] ?? "?").toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold tracking-[0.16em] text-[var(--ink-500)] uppercase">{t("store")}</p>
              <p className="mt-0.5 line-clamp-2 text-sm leading-snug font-semibold break-words text-[var(--ink-900)]" title={storeName}>{storeName}</p>
            </div>
          </div>
          {/* Same list as on the desktop; the padding makes the items float inside the panel. */}
          <nav aria-label={t("navLabel")} className="flex flex-col gap-2 px-3 pb-3">
            <KaiNav onNavigate={close} />
          </nav>
        </div>

        <div className="shrink-0 space-y-3 border-t border-[var(--ink-200)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <PlanCard collapsed={false} />
          <div className="flex items-center gap-2.5 rounded-[var(--r-md)] border border-[var(--ink-200)] bg-[var(--ink-50)] p-3">
            <div
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-orange text-[13px] font-bold text-brand-black"
            >
              {initials(user.name)}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13px] font-semibold text-[var(--ink-900)]">{user.name}</span>
              <span className="truncate text-[11px] text-[var(--ink-500)]">{user.email}</span>
            </div>
            <Link
              href="/dashboard/settings"
              onClick={close}
              title={t("user.settings")}
              aria-label={t("user.settings")}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--r-sm)] text-[var(--ink-500)] hover:bg-[var(--ink-200)] hover:text-[var(--ink-900)]"
            >
              <GearIcon size={16} />
            </Link>
            <button
              type="button"
              onClick={logout}
              disabled={pending}
              title={auth("logout")}
              aria-label={auth("logout")}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--r-sm)] text-[var(--kai-danger)] hover:bg-[var(--kai-danger-bg)] disabled:opacity-60"
            >
              <LogOutIcon size={16} />
            </button>
          </div>
          <LocaleSwitcher className="h-10 w-full cursor-pointer rounded-full border border-[var(--ink-200)] bg-white px-3 text-[13px] font-medium text-[var(--ink-700)]" />
        </div>
      </div>
    </dialog>
  );
}
