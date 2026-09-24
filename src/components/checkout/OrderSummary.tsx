"use client";

import { useTranslations } from "next-intl";
import type { PublicCheckout } from "@/server/modules/checkout/schema";
import { useFormatters } from "@/components/dashboard/useFormatters";

export function Lines({ checkout }: { checkout: PublicCheckout }) {
  const t = useTranslations("Checkout.summary");
  const f = useFormatters();

  return (
    <>
      <ul className="divide-y divide-line">
        {checkout.items.map((item, i) => (
          <li key={i} className="flex items-start justify-between gap-4 py-3 first:pt-0">
            <div className="min-w-0">
              <p className="font-medium">{item.name}</p>
              <p className="text-[13px] text-ink-muted">
                {t("quantity", { count: item.quantity })}
              </p>
            </div>
            <p className="shrink-0 tabular-nums">{f.money(item.unitAmount * item.quantity)}</p>
          </li>
        ))}
      </ul>

      <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
        <div className="flex justify-between text-ink-2">
          <dt>{t("subtotal")}</dt>
          <dd className="tabular-nums">{f.money(checkout.subtotal)}</dd>
        </div>
        <div className="flex justify-between text-ink-2">
          <dt>{t("shipping")}</dt>
          <dd className="tabular-nums">
            {checkout.shippingAmount === 0 ? t("free") : f.money(checkout.shippingAmount)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between pt-2 text-base font-semibold">
          <dt>{t("total")}</dt>
          <dd className="text-xl tabular-nums">{f.money(checkout.total)}</dd>
        </div>
      </dl>
    </>
  );
}

/** Mobile: a collapsed row that always shows the total. Desktop: a sticky side card. */
export function OrderSummary({ checkout }: { checkout: PublicCheckout }) {
  const t = useTranslations("Checkout.summary");
  const f = useFormatters();

  return (
    <>
      {/* Mobile: the amount is the headline, flat on the page; the itemised list is one tap away. */}
      <details className="group mb-8 lg:hidden">
        <summary className="flex cursor-pointer list-none items-end justify-between gap-4 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block truncate text-[13px] text-ink-muted">
              {t("payTo", { store: checkout.storeName })}
            </span>
            <span className="block font-serif text-[2.25rem] leading-tight font-normal tracking-[-0.01em] tabular-nums">
              {f.money(checkout.total)}
            </span>
          </span>
          <span className="flex min-h-11 shrink-0 items-center gap-1.5 text-sm text-ink-2 underline underline-offset-4">
            {t("toggle")}
            <svg
              aria-hidden
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform group-open:rotate-180 motion-reduce:transition-none"
            >
              <path d="M2.5 4.5 6 8l3.5-3.5" />
            </svg>
          </span>
        </summary>
        <div className="mt-3 rounded-lg border border-line bg-surface px-4 py-4">
          <Lines checkout={checkout} />
        </div>
      </details>

      <aside className="hidden lg:col-start-2 lg:row-start-1 lg:block">
        <div className="sticky top-8 rounded-lg border border-line bg-surface p-6">
          <h2 className="mb-4 font-serif text-[1.375rem] leading-tight font-medium tracking-tight">
            {t("title")}
          </h2>
          <Lines checkout={checkout} />
        </div>
      </aside>
    </>
  );
}
