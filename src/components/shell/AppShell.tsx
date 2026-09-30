"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, type ReactNode } from "react";
import { KaiHeader } from "@/components/kai/KaiHeader";
import { KaiSidebar } from "@/components/kai/KaiSidebar";
import { AlertCircleIcon } from "@/components/kai/icons";
import { Link } from "@/i18n/navigation";
import { SIDEBAR_COOKIE } from "./constants";
import { MobileDrawer } from "./MobileDrawer";
import { PlanProvider } from "./PlanProvider";

/**
 * Frame of the whole merchant area: sidebar (full or icons only), header and the scrolling page
 * area, laid out like the reference dashboard. The pages keep their own `<main>`; this provides
 * the frame and a skip link to reach it.
 */
export function AppShell({
  user,
  storeName,
  initialCollapsed,
  needsVerification,
  children,
}: {
  user: { name: string; email: string };
  storeName: string;
  initialCollapsed: boolean;
  /** The store has not been verified yet: a banner says so at the top. */
  needsVerification: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("Shell");
  const kai = useTranslations("Kai");
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const drawer = useRef<HTMLDialogElement>(null);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <PlanProvider>
      <div
        className="workspace kai-shell flex h-screen w-full overflow-hidden"
        style={{ background: "var(--ink-0)" }}
      >
        <a
          href="#content"
          className="sr-only z-50 rounded-md bg-surface px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {t("skip")}
        </a>

        <KaiSidebar user={user} collapsed={collapsed} onToggle={toggle} />
        <MobileDrawer dialogRef={drawer} storeName={storeName} />

        <div className="relative flex w-full flex-1 flex-col bg-[var(--ink-100)] lg:m-2 lg:ml-0 lg:overflow-hidden lg:rounded-xl lg:shadow-sm">
          {needsVerification && (
            <div
              role="status"
              className="flex flex-wrap items-center justify-center gap-3 bg-[var(--kai-danger)] px-4 py-2 text-[13px] font-semibold text-white"
            >
              <Link
                href="/dashboard/settings"
                className="inline-flex items-center gap-2 underline underline-offset-2"
              >
                <AlertCircleIcon size={16} />
                <span>{kai("verify")}</span>
              </Link>
            </div>
          )}
          <KaiHeader
            firstName={user.name.split(/\s+/)[0] ?? user.name}
            onMenu={() => drawer.current?.showModal()}
          />
          <main className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            <div
              id="content"
              tabIndex={-1}
              className="workspace min-h-full p-4 outline-none sm:p-8"
              style={{ background: "transparent" }}
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </PlanProvider>
  );
}
