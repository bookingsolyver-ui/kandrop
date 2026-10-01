"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { ALL_NAV_ITEMS, isCurrent, type NavItem, type NavKey } from "@/components/shell/nav";
import { CatalogIcon } from "@/components/shell/icons";
import { ChevronDownIcon } from "./icons";

const GROUPS: Array<{ key: "operation" | "growth"; items: Array<NavKey | "vitrine"> }> = [
  { key: "operation", items: ["overview", "products", "vitrine", "orders", "logistics", "customers"] },
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

/** `Vitrine` with its two sub-links; open while the current page is inside it. */
function VitrineMenu({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const t = useTranslations("Shell");
  const pathname = usePathname();
  const children = [byKey.get("vitrineNational"), byKey.get("vitrineInternational")].filter(
    (item): item is NavItem => item !== undefined
  );
  const inside = children.some((item) => isCurrent(item, pathname));
  const [open, setOpen] = useState(inside);

  // Collapsed rail: just the icon, straight to the first page of the section.
  if (collapsed) {
    return (
      <Link
        href={children[0]!.href}
        onClick={onNavigate}
        title={t("nav.vitrine")}
        aria-current={inside ? "page" : undefined}
        className={`flex min-w-0 items-center justify-center rounded-[var(--r-md)] px-3 py-2.5 transition-all duration-150 ${
          inside
            ? "bg-brand-orange text-brand-black shadow-[0_4px_20px_rgba(255,90,0,0.3)]"
            : "text-[var(--ink-700)] hover:bg-[var(--ink-100)] hover:text-[var(--ink-900)]"
        }`}
      >
        <CatalogIcon size={18} />
        <span className="sr-only">{t("nav.vitrine")}</span>
      </Link>
    );
  }

  const expanded = open || inside;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={expanded}
        className={`flex w-full min-w-0 items-center gap-3 rounded-[var(--r-md)] px-3 py-2.5 text-left transition-all duration-150 ${
          inside
            ? "bg-[var(--ink-100)] text-[var(--ink-900)]"
            : "text-[var(--ink-700)] hover:bg-[var(--ink-100)] hover:text-[var(--ink-900)]"
        }`}
      >
        <CatalogIcon size={18} />
        <span className="min-w-0 flex-1 truncate text-sm leading-tight font-medium">{t("nav.vitrine")}</span>
        <span className={`shrink-0 text-[var(--ink-500)] transition-transform ${expanded ? "" : "-rotate-90"}`}>
          <ChevronDownIcon size={14} />
        </span>
      </button>
      {expanded && (
        <ul className="mt-0.5 ml-4 flex flex-col gap-0.5 border-l border-[var(--ink-200)] pl-2">
          {children.map((item) => {
            const current = isCurrent(item, pathname);
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  prefetch
                  onClick={onNavigate}
                  aria-current={current ? "page" : undefined}
                  className={`flex min-w-0 items-center rounded-[var(--r-md)] px-3 py-2 text-[13px] transition-all duration-150 ${
                    current
                      ? "bg-brand-orange font-bold text-brand-black shadow-[0_4px_20px_rgba(255,90,0,0.3)]"
                      : "font-medium text-[var(--ink-700)] hover:bg-[var(--ink-100)] hover:text-[var(--ink-900)]"
                  }`}
                >
                  <span className="truncate">{t(`nav.${item.key}`)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
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
              if (key === "vitrine") {
                return (
                  <li key={key}>
                    <VitrineMenu collapsed={collapsed} onNavigate={onNavigate} />
                  </li>
                );
              }
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
