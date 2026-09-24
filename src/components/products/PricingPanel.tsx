"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { computeMargin } from "@/shared/products/schemas";
import { AlertIcon } from "@/components/data/icons";

/**
 * The two price inputs and, right under them, the margin they imply. The margin is the same
 * `computeMargin` the API uses for the table, so what is shown here is what will be listed.
 * `cost` / `price` are minor units, or `null` while the field is empty.
 */
export function PricingPanel({
  cost,
  price,
  children,
}: {
  cost: number | null;
  price: number | null;
  children: ReactNode;
}) {
  const t = useTranslations("Catalog.form.pricing");
  const f = useFormatters();
  const margin = cost !== null && price !== null && price > 0 ? computeMargin(cost, price) : null;
  const loss = margin !== null && margin.amount < 0;

  return (
    <section
      aria-labelledby="pricing-title"
      className="rounded-lg border border-line bg-surface p-5 sm:p-7"
    >
      <h2
        id="pricing-title"
        className="mb-5 font-serif text-[1.375rem] leading-tight font-medium tracking-tight"
      >
        {t("title")}
      </h2>
      <div className="space-y-5">{children}</div>

      <div className="mt-6 border-t border-line pt-5">
        {margin ? (
          <dl>
            <dt className="text-[11px] font-medium tracking-[0.14em] text-ink-muted uppercase">
              {t("margin")}
            </dt>
            <dd
              className={`mt-1 font-serif text-[2.25rem] leading-tight tracking-[-0.01em] tabular-nums ${
                loss ? "text-down" : ""
              }`}
            >
              {margin.rate === null ? "—" : f.percent(margin.rate, 1)}
            </dd>
            <dt className="mt-4 text-[13px] text-ink-muted">{t("amount")}</dt>
            <dd className={`font-medium tabular-nums ${loss ? "text-down" : ""}`}>
              {f.money(margin.amount)}
            </dd>
          </dl>
        ) : (
          <p className="text-[13px] leading-snug text-ink-muted">{t("empty")}</p>
        )}

        {loss && (
          <p
            role="status"
            className="mt-4 flex items-start gap-2 text-[13px] leading-snug text-down"
          >
            <span className="mt-px">
              <AlertIcon />
            </span>
            {t("negative")}
          </p>
        )}
      </div>
    </section>
  );
}
