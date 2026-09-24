"use client";

import { useTranslations } from "next-intl";
import { SortableTh, TH, type SortState } from "@/components/data/SortableTh";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { Link } from "@/i18n/navigation";
import type { PublicProduct } from "@/server/modules/products/schema";
import type { ProductSort } from "@/shared/products/schemas";
import { TrashIcon } from "./icons";
import { ProductThumb } from "./ProductThumb";
import { StatusBadge } from "./StatusBadge";

export function ProductsTable({
  items,
  sort,
  onSort,
  onDelete,
}: {
  items: PublicProduct[];
  sort: SortState<ProductSort>;
  onSort: (column: Exclude<ProductSort, "updated">) => void;
  onDelete: (product: PublicProduct) => void;
}) {
  const t = useTranslations("Catalog");
  const f = useFormatters();

  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{t("table.caption")}</caption>
      <thead>
        <tr className="border-b border-line text-left">
          <SortableTh
            column="title"
            label={t("table.product")}
            ariaLabel={t("table.sortBy", { column: t("table.product") })}
            sort={sort}
            onSort={onSort}
          />
          <th scope="col" className={`${TH} hidden pl-4 md:table-cell`}>
            {t("table.category")}
          </th>
          <th scope="col" className={`${TH} hidden pl-4 sm:table-cell`}>
            {t("table.status")}
          </th>
          <th scope="col" className={`${TH} hidden pl-4 text-right lg:table-cell`}>
            {t("table.cost")}
          </th>
          <SortableTh
            column="price"
            label={t("table.price")}
            ariaLabel={t("table.sortBy", { column: t("table.price") })}
            sort={sort}
            onSort={onSort}
            className="pl-4 text-right"
          />
          <SortableTh
            column="margin"
            label={t("table.margin")}
            ariaLabel={t("table.sortBy", { column: t("table.margin") })}
            sort={sort}
            onSort={onSort}
            className="hidden pl-4 text-right md:table-cell"
          />
          <th scope="col" className={`${TH} hidden pl-4 text-right lg:table-cell`}>
            {t("table.views")}
          </th>
          <th scope="col" className="w-0 pl-2">
            <span className="sr-only">{t("table.actions")}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((p) => {
          const rate = p.margin.rate === null ? "—" : f.percent(p.margin.rate, 1);
          return (
            <tr
              key={p.id}
              className="border-b border-line transition-colors last:border-0 hover:bg-page"
            >
              <td className="w-full max-w-0 py-3 pr-2 pl-1">
                <div className="flex items-center gap-3">
                  <ProductThumb src={p.images[0]?.url} />
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/products/${p.id}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {p.title}
                    </Link>
                    <p className="truncate text-[13px] text-ink-muted md:hidden">
                      {t(`categories.${p.category}`)}
                    </p>
                    <div className="sm:hidden">
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                </div>
              </td>
              <td className="hidden py-3 pl-4 whitespace-nowrap text-ink-2 md:table-cell">
                {t(`categories.${p.category}`)}
              </td>
              <td className="hidden py-3 pl-4 sm:table-cell">
                <StatusBadge status={p.status} />
              </td>
              <td className="hidden py-3 pl-4 text-right whitespace-nowrap text-ink-2 tabular-nums lg:table-cell">
                {f.money(p.costPrice)}
              </td>
              <td className="py-3 pl-4 text-right whitespace-nowrap tabular-nums">
                <span className="font-medium">{f.money(p.salePrice)}</span>
                {/* Margin has its own column from md; on phones it sits under the price. */}
                <span
                  className={`block text-[13px] md:hidden ${p.margin.amount < 0 ? "text-down" : "text-ink-muted"}`}
                >
                  {rate}
                </span>
              </td>
              <td
                className={`hidden py-3 pl-4 text-right whitespace-nowrap tabular-nums md:table-cell ${p.margin.amount < 0 ? "text-down" : "text-ink-2"}`}
              >
                {rate}
              </td>
              <td className="hidden py-3 pl-4 text-right whitespace-nowrap text-ink-2 tabular-nums lg:table-cell">
                {f.integer(p.views)}
              </td>
              <td className="py-3 pl-2 text-right">
                <button
                  type="button"
                  onClick={() => onDelete(p)}
                  aria-label={t("table.delete", { title: p.title })}
                  className="hidden size-11 place-items-center rounded-md text-ink-muted hover:text-down sm:inline-grid"
                >
                  <TrashIcon />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
