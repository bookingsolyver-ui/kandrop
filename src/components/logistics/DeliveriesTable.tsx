"use client";

import { useTranslations } from "next-intl";
import { TH } from "@/components/data/SortableTh";
import { useOrderFormat } from "@/components/orders/useOrderFormat";
import type { PublicDelivery } from "@/server/modules/logistics/schema";
import { DeliveryStatusBadge } from "./DeliveryStatusBadge";
import { liveState } from "./live";
import { TripProgress } from "./TripProgress";

/**
 * One line per delivery: order, where, who carries it, how far along, and the state. The
 * progress bar moves on its own (`now` ticks every second in the parent). Delivered rows offer
 * the proof of delivery straight from the table.
 */
export function DeliveriesTable({
  items,
  now,
  onOpen,
  onProof,
}: {
  items: PublicDelivery[];
  now: number;
  onOpen: (delivery: PublicDelivery) => void;
  onProof: (delivery: PublicDelivery) => void;
}) {
  const t = useTranslations("Logistics");
  const fmt = useOrderFormat();

  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{t("table.caption")}</caption>
      <thead>
        <tr className="border-b border-line text-left">
          <th scope="col" className={`${TH} py-3`}>
            {t("table.order")}
          </th>
          <th scope="col" className={`${TH} hidden py-3 pl-4 sm:table-cell`}>
            {t("table.zone")}
          </th>
          <th scope="col" className={`${TH} hidden py-3 pl-4 md:table-cell`}>
            {t("table.courier")}
          </th>
          <th scope="col" className={`${TH} hidden w-44 py-3 pl-4 lg:table-cell`}>
            {t("table.progress")}
          </th>
          <th scope="col" className={`${TH} py-3 pl-4`}>
            {t("table.status")}
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((d) => {
          const live = liveState(d, now);
          return (
            <tr
              key={d.id}
              onClick={() => onOpen(d)}
              className="cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-page"
            >
              <td className="py-3.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(d);
                  }}
                  aria-label={t("table.open", { number: fmt.number(d.orderNumber) })}
                  className="-mx-1 min-h-11 rounded px-1 text-left font-medium tabular-nums underline-offset-4 hover:underline"
                >
                  {fmt.number(d.orderNumber)}
                </button>
                <p className="-mt-2 text-[13px] text-ink-muted sm:hidden">{d.zone}</p>
              </td>
              <td className="hidden py-3.5 pl-4 whitespace-nowrap sm:table-cell">{d.zone}</td>
              <td className="hidden py-3.5 pl-4 md:table-cell">
                <p className="font-medium whitespace-nowrap">{d.courier.name}</p>
                <a
                  href={`tel:+244${d.courier.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[13px] text-ink-2 tabular-nums underline underline-offset-4 hover:text-ink"
                >
                  {fmt.phone(d.courier.phone)}
                </a>
              </td>
              <td className="hidden py-3.5 pl-4 lg:table-cell">
                <TripProgress
                  progress={live.progress}
                  stage={live.stage}
                  outcome={d.outcome}
                  compact
                />
              </td>
              <td className="py-3.5 pl-4">
                <DeliveryStatusBadge status={live.status} />
                {live.status === "delivered" && d.proof && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onProof(d);
                    }}
                    className="mt-1 block min-h-9 text-left text-[13px] text-accent underline underline-offset-4 hover:opacity-80"
                  >
                    {t("table.proof")}
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
