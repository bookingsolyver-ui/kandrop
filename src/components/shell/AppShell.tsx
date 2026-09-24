"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, type ReactNode } from "react";
import { SIDEBAR_COOKIE } from "./constants";
import { Header } from "./Header";
import { MobileDrawer } from "./MobileDrawer";
import { PlanProvider } from "./PlanProvider";
import { Sidebar } from "./Sidebar";

/**
 * Frame of the whole merchant area: sidebar (rail or full) and header around the page. The
 * page keeps its own `<main>`; this only provides the frame and a skip link to reach it.
 */
export function AppShell({
  user,
  storeName,
  initialCollapsed,
  children,
}: {
  user: { name: string; email: string };
  storeName: string;
  initialCollapsed: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("Shell");
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const drawer = useRef<HTMLDialogElement>(null);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <PlanProvider>
      <div className="workspace min-h-screen">
        <a
          href="#content"
          className="sr-only z-50 rounded-md bg-surface px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {t("skip")}
        </a>

        <Sidebar collapsed={collapsed} storeName={storeName} onToggle={toggle} />
        <MobileDrawer dialogRef={drawer} storeName={storeName} />

        <div
          className={`transition-[padding] duration-200 motion-reduce:transition-none ${
            collapsed ? "lg:pl-[4.5rem]" : "lg:pl-64"
          }`}
        >
          <Header user={user} onMenu={() => drawer.current?.showModal()} />
          <div
            id="content"
            tabIndex={-1}
            className="mx-auto max-w-7xl px-4 py-8 outline-none sm:px-6 sm:py-10 lg:px-8"
          >
            {children}
          </div>
        </div>
      </div>
    </PlanProvider>
  );
}
