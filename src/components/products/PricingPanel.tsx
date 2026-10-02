"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import {
  DEFAULT_DELIVERY_CITY,
  DELIVERY_CITIES,
  SHIPPING_RATES,
} from "@/shared/fulfilment/schemas";
import {
  SHIPPING_BEARERS,
  breakEvenPrice,
  computeMargin,
  merchantShippingCost,
  type ShippingBearer,
} from "@/shared/products/schemas";
import { AlertIcon } from "@/components/data/icons";

/**
 * The two price inputs and, right under them, the margin they imply. The margin is the same
 * `computeMargin` the API uses for the table, so what is shown here is what will be listed.
 * `cost` / `price` are minor units, or `null` while the field is empty. The freight choice sits
 * between the inputs and the result because it changes the result: when the merchant pays the
 * delivery, its estimated cost comes off the margin and moves the break-even price up.
 */
export function PricingPanel({
  cost,
  price,
  shippingBearer,
  onShippingBearerChange,
  children,
}: {
  cost: number | null;
  price: number | null;
  shippingBearer: ShippingBearer;
  onShippingBearerChange: (bearer: ShippingBearer) => void;
  children: ReactNode;
}) {
  const t = useTranslations("Catalog.form.pricing");
  const f = useFormatters();
  const margin =
    cost !== null && price !== null && price > 0
      ? computeMargin(cost, price, shippingBearer)
      : null;
  const loss = margin !== null && margin.amount < 0;
  const merchantPays = shippingBearer === "merchant";
  // What is shown is the Luanda case (the common one); with the freight on the merchant each province has
  // its own cost and break-even, and the warning follows the worst of them.
  const worstCity = DELIVERY_CITIES.reduce((a, b) =>
    SHIPPING_RATES[b] > SHIPPING_RATES[a] ? b : a
  );
  const belowBreakEven =
    merchantPays &&
    cost !== null &&
    price !== null &&
    price > 0 &&
    price < breakEvenPrice(cost, shippingBearer, worstCity);

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

      <fieldset className="mt-6 border-t border-line pt-5">
        <legend className="mb-1 text-[11px] font-medium tracking-[0.14em] text-ink-muted uppercase">
          {t("shipping.title")}
        </legend>
        <p className="mb-3 text-[13px] leading-snug text-ink-muted">{t("shipping.hint")}</p>
        <div className="space-y-2">
          {SHIPPING_BEARERS.map((bearer) => (
            <label
              key={bearer}
              className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 ${
                shippingBearer === bearer ? "border-ink bg-page" : "border-line"
              }`}
            >
              <input
                type="radio"
                name="shippingBearer"
                value={bearer}
                checked={shippingBearer === bearer}
                onChange={() => onShippingBearerChange(bearer)}
                className="mt-1 size-4 accent-[currentColor]"
              />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-x-2 text-[15px] font-medium">
                  {t(`shipping.${bearer}.label`)}
                  <span className="text-[11px] font-medium tracking-wide text-ink-muted uppercase">
                    {t(`shipping.${bearer}.badge`)}
                  </span>
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">
                  {t(`shipping.${bearer}.description`)}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

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
            {merchantPays && (
              <>
                <dt className="mt-4 text-[13px] text-ink-muted">{t("shippingCost")}</dt>
                {DELIVERY_CITIES.map((city) => (
                  <dd key={city} className="flex justify-between gap-4 font-medium tabular-nums">
                    <span className="text-ink-muted">{city}</span>
                    <span>−{f.money(merchantShippingCost(shippingBearer, city))}</span>
                  </dd>
                ))}
              </>
            )}
            {cost !== null && (
              <>
                <dt className="mt-4 text-[13px] text-ink-muted">{t("breakEven")}</dt>
                {(merchantPays ? DELIVERY_CITIES : ([DEFAULT_DELIVERY_CITY] as const)).map(
                  (city) => (
                    <dd key={city} className="flex justify-between gap-4 font-medium tabular-nums">
                      {merchantPays && <span className="text-ink-muted">{city}</span>}
                      <span>{f.money(breakEvenPrice(cost, shippingBearer, city))}</span>
                    </dd>
                  )
                )}
              </>
            )}
          </dl>
        ) : (
          <p className="text-[13px] leading-snug text-ink-muted">{t("empty")}</p>
        )}

        {(loss || belowBreakEven) && (
          <p
            role="status"
            className="mt-4 flex items-start gap-2 text-[13px] leading-snug text-down"
          >
            <span className="mt-px">
              <AlertIcon />
            </span>
            {merchantPays && cost !== null
              ? t("negativeShipping", {
                  price: f.money(breakEvenPrice(cost, shippingBearer, worstCity)),
                  city: worstCity,
                })
              : t("negative")}
          </p>
        )}
      </div>
    </section>
  );
}
