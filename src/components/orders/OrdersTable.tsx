"use client";

import { useTranslations } from "next-intl";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { SortableTh, TH, type SortState } from "@/components/data/SortableTh";
import type { PublicOrder } from "@/server/modules/orders/schema";
import type { OrderSort } from "@/shared/orders/schemas";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { useOrderFormat } from "./useOrderFormat";

/**
 * High-density table: one line per order. Columns drop out as the screen narrows (the customer
 * moves under the order number, the date under the total) but never the total or the status.
 */
export function OrdersTable({
  items,
  sort,
  onSort,
  onOpen,
}: {
  items: PublicOrder[];
  sort: SortState<OrderSort>;
  onSort: (column: OrderSort) => void;
  onOpen: (order: PublicOrder) => void;
}) {
  const t = useTranslations("Orders");
  const f = useFormatters();
  const fmt = useOrderFormat();

  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{t("table.caption")}</caption>
      <thead>
        <tr className="border-b border-line text-left">
          <th scope="col" className={`${TH} py-2 md:pr-4`}>
            {t("table.order")}
          </th>
          <SortableTh
            column="customer"
            label={t("table.customer")}
            ariaLabel={t("table.sortBy", { column: t("table.customer") })}
            sort={sort}
            onSort={onSort}
            className="hidden md:table-cell"
          />
          <th scope="col" className={`${TH} hidden pl-4 lg:table-cell`}>
            {t("table.products")}
          </th>
          <SortableTh
            column="date"
            label={t("table.date")}
            ariaLabel={t("table.sortBy", { column: t("table.date") })}
            sort={sort}
            onSort={onSort}
            className="hidden pl-4 sm:table-cell"
          />
          <SortableTh
            column="total"
            label={t("table.total")}
            ariaLabel={t("table.sortBy", { column: t("table.total") })}
            sort={sort}
            onSort={onSort}
            className="pl-4 text-right"
          />
          <th scope="col" className={`${TH} hidden pl-4 sm:table-cell`}>
            {t("table.status")}
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((o) => {
          const first = o.items[0]!;
          const more = o.items.length - 1;
          const cancelled = o.status === "cancelled";
          return (
            <tr
              key={o.id}
              onClick={() => onOpen(o)}
              className="cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-page"
            >
              <td className="w-full max-w-0 py-3 pr-2 md:w-auto md:max-w-none md:pr-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(o);
                  }}
                  aria-label={t("table.open", { number: fmt.number(o.number) })}
                  className="-mx-1 min-h-11 rounded px-1 text-left font-medium tabular-nums underline-offset-4 hover:underline"
                >
                  {fmt.number(o.number)}
                </button>
                {/* Phones: who and what state sit under the number. */}
                <p className="-mt-2 truncate text-[13px] text-ink-2 md:hidden">{o.customer.name}</p>
                <div className="mt-1 sm:hidden">
                  <OrderStatusBadge status={o.status} />
                </div>
              </td>
              <td className="hidden py-3 whitespace-nowrap md:table-cell">
                <p className="font-medium">{o.customer.name}</p>
                <p className="text-[13px] text-ink-muted">{o.address.city}</p>
              </td>
              <td className="hidden max-w-[16rem] py-3 pl-4 lg:table-cell">
                <p className="truncate">{first.name}</p>
                {more > 0 && (
                  <p className="text-[13px] text-ink-muted">{t("table.more", { count: more })}</p>
                )}
              </td>
              <td className="hidden py-3 pl-4 whitespace-nowrap text-ink-2 tabular-nums sm:table-cell">
                {fmt.short(o.createdAt)}
              </td>
              <td
                className={`py-3 pl-4 text-right whitespace-nowrap tabular-nums ${
                  cancelled ? "text-ink-muted" : "font-medium"
                }`}
              >
                {f.money(o.total)}
                <span className="block text-[13px] font-normal text-ink-muted sm:hidden">
                  {fmt.short(o.createdAt)}
                </span>
              </td>
              <td className="hidden py-3 pl-4 sm:table-cell">
                <OrderStatusBadge status={o.status} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
