"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useLogout } from "@/components/auth/useLogout";
import { Link } from "@/i18n/navigation";
import { KaiNav } from "./KaiNav";
import { ChevronLeftIcon, ChevronRightIcon, GearIcon, LogOutIcon } from "./icons";

const initials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0]![0], parts[parts.length - 1]![0]] : [parts[0]?.[0]];
  return letters.join("").toUpperCase() || "?";
};

/** Desktop sidebar of the merchant area (the phone drawer is `MobileDrawer`). */
export function KaiSidebar({
  user,
  collapsed,
  onToggle,
}: {
  user: { name: string; email: string };
  collapsed: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("Shell");
  const auth = useTranslations("Auth");
  const { logout, pending } = useLogout();

  return (
    // The wrapper holds the sidebar's width in the flex row (the panel itself is `fixed`), so it
    // can neither shrink nor grow.
    <div
      className={`group peer hidden shrink-0 text-[var(--ink-900)] transition-[width] duration-200 ease-linear lg:block ${
        collapsed ? "w-[var(--sidebar-width-icon)]" : "w-[var(--sidebar-width)]"
      }`}
      data-state={collapsed ? "collapsed" : "expanded"}
    >
      <aside
        aria-label={t("navLabel")}
        className={`fixed inset-y-0 left-0 z-20 flex h-screen border-r border-[var(--ink-200)] bg-[var(--ink-0)] p-2 transition-[width] duration-200 ease-linear ${
          collapsed ? "w-[var(--sidebar-width-icon)]" : "w-[var(--sidebar-width)]"
        }`}
      >
        <div className="flex h-full w-full flex-col overflow-visible">
          <div className="flex flex-col gap-2 px-4 pt-5 pb-3">
            <div className={`flex items-center px-1 pb-2 ${collapsed ? "justify-center" : ""}`}>
              <Link
                href="/dashboard"
                aria-label="Kandrop"
                className="inline-flex items-center rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[var(--kai-orange)]/40"
              >
                {collapsed ? (
                  <Image src="/brand/k-mark.png" alt="" width={40} height={40} priority className="size-10" />
                ) : (
                  <Image
                    src="/logo-kandrop-full.png"
                    alt=""
                    width={1024}
                    height={206}
                    priority
                    className="h-8 w-auto object-contain"
                  />
                )}
              </Link>
            </div>
            <div className="mx-1 h-px bg-[var(--ink-200)]" />
          </div>

          <nav
            aria-label={t("navLabel")}
            className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 py-1"
          >
            <KaiNav collapsed={collapsed} />
          </nav>

          <div className="flex flex-col gap-2 px-2 pt-2 pb-4">
            <div className="mx-2 mb-2 h-px bg-[var(--ink-200)]" />
            <div
              className={`flex items-center gap-2.5 rounded-[var(--r-md)] border border-[var(--ink-200)] bg-[var(--ink-50)] p-3 ${
                collapsed ? "flex-col" : ""
              }`}
            >
              <div
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--kai-orange)] text-[13px] font-bold text-white"
              >
                {initials(user.name)}
              </div>
              {!collapsed && (
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] font-semibold text-[var(--ink-900)]">
                    {user.name}
                  </span>
                  <span className="truncate text-[11px] text-[var(--ink-500)]">{user.email}</span>
                </div>
              )}
              <div className={`flex shrink-0 items-center gap-1 ${collapsed ? "flex-col" : ""}`}>
                <Link
                  href="/dashboard/settings"
                  title={t("user.settings")}
                  aria-label={t("user.settings")}
                  className="flex h-7 w-7 items-center justify-center rounded-[var(--r-sm)] text-[var(--ink-500)] transition-all hover:bg-[var(--ink-200)] hover:text-[var(--ink-900)]"
                >
                  <GearIcon size={16} />
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  disabled={pending}
                  title={auth("logout")}
                  aria-label={auth("logout")}
                  className="flex h-7 w-7 items-center justify-center rounded-[var(--r-sm)] text-[var(--kai-danger)] transition-all hover:bg-[var(--kai-danger-bg)] disabled:opacity-60"
                >
                  <LogOutIcon size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? t("expand") : t("collapse")}
          aria-expanded={!collapsed}
          className="absolute top-1/2 -right-3.5 z-50 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--kai-orange)] text-white shadow-md transition-colors duration-150 hover:bg-[var(--kai-orange-600)]"
        >
          {collapsed ? <ChevronRightIcon size={16} /> : <ChevronLeftIcon size={16} />}
        </button>
      </aside>
    </div>
  );
}
