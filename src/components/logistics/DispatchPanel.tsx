"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { ListMessage } from "@/components/data/ListStates";
import { useOrderFormat } from "@/components/orders/useOrderFormat";
import { Link } from "@/i18n/navigation";
import type { ApiErrorCode } from "@/server/http/errors";
import type { PublicOrder } from "@/server/modules/orders/schema";

/**
 * Quick dispatch: the orders that are packed and waiting for a courier (status "Processing").
 * One click hands an order to the Kandrop network: the courier is chosen for the order's zone.
 * Nothing is hidden behind a form: the merchant sees what is waiting, where it goes and what it
 * is worth, and acts on the row.
 */
export function DispatchPanel({
  orders,
  canManage,
  onDispatch,
}: {
  orders: PublicOrder[];
  canManage: boolean;
  /** Returns an error code, or `null` when the order was handed over. */
  onDispatch: (order: PublicOrder) => Promise<ApiErrorCode | null>;
}) {
  const t = useTranslations("Logistics.dispatch");
  const errors = useTranslations("Errors");
  const f = useFormatters();
  const fmt = useOrderFormat();
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<Record<string, ApiErrorCode>>({});

  async function dispatch(order: PublicOrder) {
    if (busy) return;
    setBusy(order.id);
    setFailed((prev) => {
      const next = { ...prev };
      delete next[order.id];
      return next;
    });
    const error = await onDispatch(order);
    setBusy(null);
    if (error) setFailed((prev) => ({ ...prev, [order.id]: error }));
  }

  return (
    <section aria-labelledby="dispatch-title" className="rounded-lg border border-line bg-surface">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line px-5 py-5 sm:px-7">
        <div>
          <h2
            id="dispatch-title"
            className="font-serif text-[1.375rem] leading-tight font-medium tracking-tight"
          >
            {t("title")}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{t("subtitle")}</p>
        </div>
        <p
          className="rounded-full border border-line px-3 py-1 text-[13px] text-ink-2 tabular-nums"
          aria-live="polite"
        >
          {t("waiting", { count: orders.length })}
        </p>
      </header>

      {orders.length === 0 ? (
        <ListMessage
          title={t("empty.title")}
          body={t("empty.body")}
          action={
            <Link
              href="/dashboard/orders"
              className="inline-flex h-11 items-center rounded-md border border-field px-5 text-sm font-medium hover:bg-ink/5"
            >
              {t("empty.cta")}
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-line">
          {orders.map((order) => {
            const first = order.items[0]!;
            const more = order.items.length - 1;
            const error = failed[order.id];
            return (
              <li key={order.id} className="px-5 py-4 sm:px-7">
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-baseline gap-x-3">
                      <span className="font-medium tabular-nums">{fmt.number(order.number)}</span>
                      <span className="text-ink-2">{order.customer.name}</span>
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink-muted">
                      <span className="rounded-full border border-line px-2 py-px text-ink-2">
                        {order.address.zone ?? order.address.city}
                      </span>{" "}
                      · {first.name}
                      {more > 0 && ` ${t("more", { count: more })}`} ·{" "}
                      <span className="tabular-nums">{f.money(order.total)}</span>
                    </p>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => dispatch(order)}
                      disabled={busy !== null}
                      aria-busy={busy === order.id}
                      className="h-11 shrink-0 rounded-md border border-accent/70 px-5 text-sm font-semibold text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy === order.id ? t("assigning") : t("assign")}
                    </button>
                  )}
                </div>
                {error && (
                  <p role="alert" className="mt-2 text-sm text-down">
                    {errors(error)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
