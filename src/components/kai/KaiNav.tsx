"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ALL_NAV_ITEMS, isCurrent, type NavItem, type NavKey } from "@/components/shell/nav";

const GROUPS: Array<{ key: "operation" | "growth"; items: NavKey[] }> = [
  { key: "operation", items: ["overview", "products", "catalog", "orders", "logistics", "customers"] },
  {
    key: "growth",
    items: ["wallet", "whatsapp", "affiliates", "landingPages", "academy", "plans", "support"],
  },
];

const byKey = new Map(ALL_NAV_ITEMS.map((item) => [item.key, item]));

function NavLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("Shell");
  const pathname = usePathname();
  const current = isCurrent(item, pathname);
  const Icon = item.icon;
  const label = t(`nav.${item.key}`);

  return (
    <Link
      href={item.href}
      prefetch
      onClick={onNavigate}
      aria-current={current ? "page" : undefined}
      title={label}
      className={`flex min-w-0 items-center gap-3 rounded-[var(--r-md)] px-3 py-2.5 transition-all duration-150 ${
        collapsed ? "justify-center" : ""
      } ${
        current
          ? "bg-brand-orange font-bold text-brand-black shadow-[0_4px_20px_rgba(255,90,0,0.3)]"
          : "text-[var(--ink-700)] hover:bg-[var(--ink-100)] hover:text-[var(--ink-900)]"
      }`}
    >
      <Icon size={18} />
      <span className={collapsed ? "sr-only" : "min-w-0 flex-1 truncate text-sm leading-tight font-medium"}>
        {label}
      </span>
      {item.soon && !collapsed && (
        <span className="ml-auto shrink-0 rounded-[var(--r-pill)] bg-[var(--ink-100)] px-2 py-0.5 text-[10px] leading-4 font-semibold whitespace-nowrap text-[var(--ink-600)]">
          {t("soon")}
        </span>
      )}
    </Link>
  );
}

/**
 * The grouped menu, shared by the desktop sidebar and the phone drawer so the two can never drift
 * apart: same links, same rounded items, same orange active state.
 */
export function KaiNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const kai = useTranslations("Kai");
  return (
    <>
      {GROUPS.map((group, index) => (
        <div key={group.key}>
          {!collapsed && (
            <p
              className={`px-3 pb-1.5 text-[10.5px] font-bold tracking-[0.08em] text-[var(--ink-500)] uppercase ${
                index === 0 ? "pt-3" : "pt-4"
              }`}
            >
              {kai(`groups.${group.key}`)}
            </p>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((key) => {
              const item = byKey.get(key);
              return item ? (
                <li key={key}>
                  <NavLink item={item} collapsed={collapsed} onNavigate={onNavigate} />
                </li>
              ) : null;
            })}
          </ul>
        </div>
      ))}
    </>
  );
}
