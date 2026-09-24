"use client";

import { useTranslations } from "next-intl";
import { CollapseIcon } from "./icons";
import { PlanCard } from "./PlanCard";
import { SidebarNav } from "./SidebarNav";
import { Wordmark } from "./Wordmark";

export const SIDEBAR_ID = "app-sidebar";

/**
 * Desktop sidebar (from `lg`): full width with grouped labels, or a narrow icon rail. The choice
 * is remembered by the caller. Below `lg` it does not exist: the drawer takes over.
 * Vertical space is tight (twelve destinations and a plan card), so the collapse control lives in
 * the header row and the store name is a single line.
 */
export function Sidebar({
  collapsed,
  storeName,
  onToggle,
}: {
  collapsed: boolean;
  storeName: string;
  onToggle: () => void;
}) {
  const t = useTranslations("Shell");

  const toggle = (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-controls={SIDEBAR_ID}
      aria-label={collapsed ? t("expand") : t("collapse")}
      title={collapsed ? t("expand") : t("collapse")}
      className="grid size-9 shrink-0 place-items-center rounded-md text-ink-muted hover:bg-ink/5 hover:text-ink"
    >
      <span
        className={`transition-transform motion-reduce:transition-none ${collapsed ? "rotate-180" : ""}`}
      >
        <CollapseIcon />
      </span>
    </button>
  );

  return (
    <aside
      id={SIDEBAR_ID}
      className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-surface transition-[width] duration-200 motion-reduce:transition-none lg:flex ${
        collapsed ? "w-[4.5rem]" : "w-64"
      }`}
    >
      <div
        className={`flex h-16 shrink-0 items-center border-b border-line ${
          collapsed ? "justify-center" : "justify-between pr-3 pl-5"
        }`}
      >
        <Wordmark compact={collapsed} />
        {!collapsed && toggle}
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 pt-3">
        {!collapsed && (
          <p
            className="mb-3 truncate px-3 text-sm font-medium"
            title={`${t("store")}: ${storeName}`}
          >
            <span className="sr-only">{t("store")}: </span>
            {storeName}
          </p>
        )}
        <SidebarNav collapsed={collapsed} dense />
      </div>

      <div className="space-y-2 border-t border-line p-3">
        <PlanCard collapsed={collapsed} />
        {collapsed && <div className="flex justify-center">{toggle}</div>}
      </div>
    </aside>
  );
}
