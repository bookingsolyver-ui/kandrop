"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NAV_GROUPS, isCurrent, type NavItem } from "./nav";

function NavLink({
  item,
  collapsed,
  dense,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  dense: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("Shell");
  const pathname = usePathname();
  const current = isCurrent(item, pathname);
  const Icon = item.icon;
  const label = t(`nav.${item.key}`);
  // Not built yet: dimmer, and the tooltip / screen readers say so. (A visible pill would
  // truncate the longer French and Portuguese names; the page itself is explicit anyway.)
  const tooltip = item.soon ? `${label} — ${t("soon")}` : collapsed ? label : undefined;

  return (
    <Link
      href={item.href}
      // Full prefetch, dynamic pages included: the click then finds the page in the client cache
      // and renders it in the same commit, instead of showing the loading fallback first (React
      // holds any Suspense reveal for 300 ms after a fallback, which is what "instant" cannot afford).
      prefetch
      onClick={onNavigate}
      aria-current={current ? "page" : undefined}
      // Collapsed to icons: the name moves to a tooltip and stays available to screen readers.
      title={tooltip}
      className={`group relative flex items-center gap-3 rounded-md px-3 text-sm transition-colors motion-reduce:transition-none ${
        dense ? "min-h-9" : "min-h-11"
      } ${collapsed ? "justify-center" : ""} ${
        current
          ? "bg-accent/10 font-medium text-accent"
          : item.soon
            ? "text-ink-muted hover:bg-ink/5 hover:text-ink-2"
            : "text-ink-2 hover:bg-ink/5 hover:text-ink"
      }`}
    >
      {/* The active marker is shape, not just colour. */}
      {current && (
        <span aria-hidden className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-accent" />
      )}
      <Icon />
      <span className={collapsed ? "sr-only" : "min-w-0 flex-1 truncate"}>{label}</span>
      {item.soon && <span className="sr-only">{t("soon")}</span>}
    </Link>
  );
}

/** The navigation itself; the desktop sidebar and the phone drawer both render this. */
export function SidebarNav({
  collapsed = false,
  dense = false,
  onNavigate,
}: {
  collapsed?: boolean;
  dense?: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("Shell");
  return (
    <nav aria-label={t("navLabel")} className="min-h-0 flex-1 overflow-y-auto pb-2">
      {NAV_GROUPS.map((group, index) => (
        <div
          key={group.key}
          className={index === 0 ? "" : collapsed ? "mt-2.5 border-t border-line pt-2.5" : "mt-4"}
        >
          {!collapsed && (
            <h2 className="px-3 pb-1 text-[10px] font-medium tracking-[0.16em] text-ink-muted uppercase">
              {t(`groups.${group.key}`)}
            </h2>
          )}
          <ul aria-label={collapsed ? t(`groups.${group.key}`) : undefined} className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.key}>
                <NavLink item={item} collapsed={collapsed} dense={dense} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
