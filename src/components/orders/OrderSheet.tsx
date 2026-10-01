"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { CloseIcon } from "@/components/data/icons";
import { useFormatters } from "@/components/dashboard/useFormatters";
import type { PublicOrder } from "@/server/modules/orders/schema";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { useOrderFormat } from "./useOrderFormat";

const H3 = "text-[11px] font-medium tracking-[0.14em] uppercase text-ink-muted";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line px-5 py-5 first:border-0 sm:px-7">
      <h3 className={`${H3} mb-3`}>{title}</h3>
      {children}
    </section>
  );
}

/**
 * The order, in a side sheet that keeps the list (and its filters) exactly where the merchant
 * left it. READ-ONLY: Kandrop alone moves an order (payment verification, collection, delivery);
 * the merchant only follows it. Native `<dialog>`: focus is trapped, Esc closes, focus goes back
 * to the row that opened it.
 */
export function OrderSheet({ order, onClose }: { order: PublicOrder; onClose: () => void }) {
  const t = useTranslations("Orders");
  const methods = useTranslations("Checkout.method");
  const f = useFormatters();
  const fmt = useOrderFormat();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      aria-labelledby="order-title"
      className="fixed inset-y-0 right-0 m-0 h-dvh max-h-none w-full max-w-lg overflow-hidden border-l border-line bg-surface p-0 text-ink backdrop:bg-black/50"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <h2
              id="order-title"
              className="font-serif text-[1.75rem] leading-tight font-normal tabular-nums"
            >
              {t("detail.title", { number: fmt.number(order.number) })}
            </h2>
            <p className="mt-1 text-[13px] text-ink-muted">
              {t("detail.placed", { date: fmt.long(order.createdAt) })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label={t("detail.close")}
            className="-mr-2 grid size-11 shrink-0 place-items-center rounded-md text-ink-2 hover:text-ink"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <Section title={t("table.status")}>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <span className="text-base">
                <OrderStatusBadge status={order.status} />
              </span>
              {order.trackingCode && (
                <p className="text-[13px] text-ink-2">
                  {t("detail.tracking.shown")}:{" "}
                  <span className="font-medium tabular-nums">{order.trackingCode}</span>
                </p>
              )}
            </div>
            <ol className="mt-4 space-y-2 border-l border-line pl-4">
              {order.history.map((h, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-x-4 text-[13px]">
                  <span className="text-ink-2">{t(`status.${h.status}`)}</span>
                  <span className="text-ink-muted tabular-nums">{fmt.short(h.at)}</span>
                </li>
              ))}
            </ol>
          </Section>

          <Section title={t("detail.sections.customer")}>
            <dl className="space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-muted">{t("detail.customer.name")}</dt>
                <dd className="text-right font-medium">{order.customer.name}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-muted">{t("detail.customer.phone")}</dt>
                <dd className="text-right tabular-nums">
                  <a
                    href={`tel:+244${order.customer.phone}`}
                    className="inline-flex min-h-8 items-center underline underline-offset-4"
                  >
                    {fmt.phone(order.customer.phone)}
                  </a>
                </dd>
              </div>
              {order.customer.email && (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-muted">{t("detail.customer.email")}</dt>
                  <dd className="min-w-0 text-right break-words">
                    <a
                      href={`mailto:${order.customer.email}`}
                      className="underline underline-offset-4"
                    >
                      {order.customer.email}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </Section>

          <Section title={t("detail.sections.address")}>
            <address className="text-sm leading-relaxed not-italic">
              <p>{order.address.street}</p>
              <p>
                {order.address.city === order.address.province
                  ? order.address.city
                  : `${order.address.city}, ${order.address.province}`}
              </p>
              {order.address.reference && (
                <p className="mt-1 text-ink-2">
                  {t("detail.address.reference", { value: order.address.reference })}
                </p>
              )}
            </address>
          </Section>

          <Section title={t("detail.sections.items")}>
            <ul className="divide-y divide-line text-sm">
              {order.items.map((item, i) => (
                <li key={i} className="flex items-start justify-between gap-4 py-2 first:pt-0">
                  <div className="min-w-0">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-[13px] text-ink-muted">
                      {t("detail.items.quantity", { count: item.quantity })}
                    </p>
                  </div>
                  <p className="shrink-0 tabular-nums">
                    {f.money(item.unitAmount * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
              <div className="flex justify-between text-ink-2">
                <dt>{t("detail.items.subtotal")}</dt>
                <dd className="tabular-nums">{f.money(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-ink-2">
                <dt>{t("detail.items.shipping")}</dt>
                <dd className="tabular-nums">
                  {order.shippingAmount === 0
                    ? t("detail.items.free")
                    : f.money(order.shippingAmount)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between pt-1 font-semibold">
                <dt>{t("detail.items.total")}</dt>
                <dd className="text-lg tabular-nums">{f.money(order.total)}</dd>
              </div>
            </dl>
          </Section>

          <Section title={t("detail.sections.payment")}>
            <dl className="space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-muted">{t("detail.payment.method")}</dt>
                <dd className="text-right">{methods(`${order.payment.method}.name`)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-muted">{t("detail.payment.reference")}</dt>
                <dd className="text-right tabular-nums">{order.payment.reference}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-muted">{t("detail.payment.status")}</dt>
                <dd className="text-right">{t(`detail.payment.states.${order.paymentStatus}`)}</dd>
              </div>
              {order.paymentStatus === "paid_verified" && (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-muted">{t("detail.payment.paidAt")}</dt>
                  <dd className="text-right tabular-nums">{fmt.short(order.payment.paidAt)}</dd>
                </div>
              )}
            </dl>
          </Section>
        </div>

        <footer className="border-t border-line bg-surface px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-7">
          <p className="text-sm text-ink-2">{t("detail.managedByKandrop")}</p>
        </footer>
      </div>
    </dialog>
  );
}
