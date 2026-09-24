"use client";

import { useTranslations } from "next-intl";
import { useFormatters } from "@/components/dashboard/useFormatters";

export function Pagination({
  page,
  pageSize,
  count,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  /** Rows on the current page. */
  count: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const t = useTranslations("Common.pagination");
  const f = useFormatters();
  if (total <= pageSize) return null;

  const from = (page - 1) * pageSize + 1;
  const to = from + count - 1;
  const button = "h-11 rounded-md border border-field px-4 hover:bg-page disabled:opacity-40";

  return (
    <nav
      aria-label={t("label")}
      className="flex items-center justify-between gap-4 border-t border-line py-3 text-sm"
    >
      <p className="text-ink-muted tabular-nums">
        {t("range", { from: f.integer(from), to: f.integer(to), total: f.integer(total) })}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className={button}
        >
          {t("previous")}
        </button>
        <button
          type="button"
          disabled={to >= total}
          onClick={() => onPage(page + 1)}
          className={button}
        >
          {t("next")}
        </button>
      </div>
    </nav>
  );
}
