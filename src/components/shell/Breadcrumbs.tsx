"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ChevronIcon } from "./icons";
import { ALL_NAV_ITEMS, segmentOf } from "./nav";

interface Crumb {
  label: string;
  href?: string;
}

/**
 * `Dashboard › Products › New product`, derived from the URL so every page has one for free.
 * On phones only the current page is shown: the header has no room for the whole trail.
 */
export function Breadcrumbs() {
  const t = useTranslations("Shell");
  const pathname = usePathname();
  const [, section, sub] = pathname.split("/").filter(Boolean);

  const item = ALL_NAV_ITEMS.find((candidate) => segmentOf(candidate) === section);
  const trail: Crumb[] = [];
  if (!item) {
    trail.push({ label: t("nav.overview") });
  } else {
    trail.push({ label: t("breadcrumbs.root"), href: "/dashboard" });
    if (!sub) {
      trail.push({ label: t(`nav.${item.key}`) });
    } else {
      trail.push({ label: t(`nav.${item.key}`), href: item.href });
      trail.push({ label: sub === "new" ? t("breadcrumbs.new") : t("breadcrumbs.edit") });
    }
  }

  return (
    <nav aria-label={t("breadcrumbs.label")} className="min-w-0">
      <ol className="flex items-center gap-1.5 text-sm">
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1;
          return (
            <li
              key={i}
              className={`flex min-w-0 items-center gap-1.5 ${last ? "" : "max-sm:hidden"}`}
            >
              {i > 0 && (
                <span className="text-ink-muted max-sm:hidden">
                  <ChevronIcon />
                </span>
              )}
              {crumb.href && !last ? (
                <Link
                  href={crumb.href}
                  className="rounded text-ink-muted underline-offset-4 hover:text-ink hover:underline"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className="truncate font-medium text-ink"
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
