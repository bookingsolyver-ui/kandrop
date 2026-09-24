"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { CloseIcon } from "@/components/data/icons";
import { useOrderFormat } from "@/components/orders/useOrderFormat";
import type { PublicDelivery } from "@/server/modules/logistics/schema";
import { DeliveryStatusBadge } from "./DeliveryStatusBadge";
import { formatCountdown, liveState } from "./live";
import { TripProgress } from "./TripProgress";

const H3 = "mb-3 text-[11px] font-medium tracking-[0.14em] text-ink-muted uppercase";

/**
 * One delivery in full: who carries it, where it is going, the live bar and the timeline of what
 * happened (and when), and — once delivered — the way to the proof. A side sheet, like orders.
 */
export function DeliverySheet({
  delivery,
  now,
  onClose,
  onProof,
}: {
  delivery: PublicDelivery;
  now: number;
  onClose: () => void;
  onProof: () => void;
}) {
  const t = useTranslations("Logistics");
  const vehicles = useTranslations("Logistics.vehicles");
  const fmt = useOrderFormat();
  const ref = useRef<HTMLDialogElement>(null);
  const live = liveState(delivery, now);

  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
  }, []);

  const over = live.status !== "in_transit";
  const remaining = Math.max(0, Math.ceil((Date.parse(delivery.etaAt) - now) / 1000));

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      aria-labelledby="delivery-title"
      className="fixed inset-y-0 right-0 m-0 h-dvh max-h-none w-full max-w-lg overflow-hidden border-l border-line bg-surface p-0 text-ink backdrop:bg-black/50"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <h2
              id="delivery-title"
              className="font-serif text-[1.75rem] leading-tight tabular-nums"
            >
              {t("sheet.title", { number: fmt.number(delivery.orderNumber) })}
            </h2>
            <p className="mt-1 text-[13px] text-ink-muted tabular-nums">
              {t("sheet.code")}: {delivery.code}
            </p>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label={t("sheet.close")}
            className="-mr-2 grid size-11 shrink-0 place-items-center rounded-md text-ink-2 hover:text-ink"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <section className="px-5 py-6 sm:px-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-base">
                <DeliveryStatusBadge status={live.status} />
              </span>
              {!over ? (
                <p
                  role="status"
                  className="flex items-center gap-2 text-[13px] text-accent tabular-nums"
                >
                  <span aria-hidden className="pulse size-1.5 rounded-full bg-accent" />
                  {t("sheet.live")} · {t("sheet.eta", { time: formatCountdown(remaining) })}
                </p>
              ) : (
                <p className="text-[13px] text-ink-muted">{fmt.long(delivery.etaAt)}</p>
              )}
            </div>
            <div className="mt-5">
              <TripProgress
                progress={live.progress}
                stage={live.stage}
                outcome={delivery.outcome}
              />
            </div>

            <ol className="mt-6 space-y-2.5 border-l border-line pl-4 text-[13px]">
              {delivery.events.map((e) => {
                const at = e.at ? Date.parse(e.at) <= now : false;
                return (
                  <li key={e.stage} className="flex flex-wrap justify-between gap-x-4">
                    <span className={at ? "text-ink" : "text-ink-muted"}>
                      {t(`stages.${e.stage}`)}
                    </span>
                    <span className="text-ink-muted tabular-nums">
                      {at && e.at ? fmt.short(e.at) : "—"}
                    </span>
                  </li>
                );
              })}
            </ol>

            {live.status === "returned" && (
              <p
                role="status"
                className="mt-5 rounded-md border border-down px-4 py-3 text-sm text-down"
              >
                {t(`returnReasons.${delivery.returnReason ?? "customer_absent"}`)}
              </p>
            )}
            {live.status === "delivered" &&
              (delivery.proof ? (
                <button
                  type="button"
                  onClick={onProof}
                  className="mt-5 h-12 w-full rounded-md bg-action px-6 text-[0.9375rem] font-semibold text-on-action hover:opacity-90"
                >
                  {t("sheet.viewProof")}
                </button>
              ) : (
                <p className="mt-5 text-sm text-ink-muted">{t("sheet.proofPending")}</p>
              ))}
          </section>

          <section className="border-t border-line px-5 py-6 sm:px-7">
            <h3 className={H3}>{t("sheet.courier")}</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-muted">{t("sheet.name")}</dt>
                <dd className="font-medium">{delivery.courier.name}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-muted">{t("sheet.phone")}</dt>
                <dd className="tabular-nums">
                  <a
                    href={`tel:+244${delivery.courier.phone}`}
                    className="inline-flex min-h-8 items-center underline underline-offset-4"
                  >
                    {fmt.phone(delivery.courier.phone)}
                  </a>
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-muted">{t("sheet.vehicle")}</dt>
                <dd>{vehicles(delivery.courier.vehicle)}</dd>
              </div>
            </dl>
          </section>

          <section className="border-t border-line px-5 py-6 sm:px-7">
            <h3 className={H3}>{t("sheet.destination")}</h3>
            <address className="text-sm leading-relaxed not-italic">
              <p className="font-medium">{delivery.customerName}</p>
              <p>{delivery.street}</p>
              <p>{delivery.zone}</p>
              {delivery.reference && (
                <p className="mt-1 text-ink-2">
                  {t("sheet.landmark", { value: delivery.reference })}
                </p>
              )}
            </address>
          </section>
        </div>
      </div>
    </dialog>
  );
}
