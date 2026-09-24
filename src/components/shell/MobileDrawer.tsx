"use client";

import { useTranslations } from "next-intl";
import { useEffect, type RefObject } from "react";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { usePathname } from "@/i18n/navigation";
import { CloseIcon } from "./icons";
import { PlanCard } from "./PlanCard";
import { SidebarNav } from "./SidebarNav";
import { Wordmark } from "./Wordmark";

/**
 * The sidebar on phones and tablets: a native `<dialog>` slid in from the left (focus trap, Esc
 * and backdrop for free). It closes by itself when a link is followed or the screen grows to
 * desktop width. The language selector lives here because the header has no room for it.
 */
export function MobileDrawer({
  dialogRef,
  storeName,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  storeName: string;
}) {
  const t = useTranslations("Shell");
  const pathname = usePathname();

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
      className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-72 max-w-[85vw] overflow-hidden border-r border-line bg-surface p-0 text-ink backdrop:bg-black/50 lg:hidden"
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line pr-2 pl-5">
          <Wordmark onNavigate={close} />
          <button
            type="button"
            onClick={close}
            aria-label={t("closeMenu")}
            className="grid size-11 place-items-center rounded-md text-ink-2 hover:text-ink"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-3 pt-4">
          <div className="mb-4 px-3">
            <p className="text-[10px] font-medium tracking-[0.16em] text-ink-muted uppercase">
              {t("store")}
            </p>
            <p className="mt-1 truncate text-sm font-medium">{storeName}</p>
          </div>
          <SidebarNav onNavigate={close} />
        </div>

        <div className="space-y-3 border-t border-line p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <PlanCard collapsed={false} />
          <LocaleSwitcher />
        </div>
      </div>
    </dialog>
  );
}
