"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import {
  DEFAULT_DELIVERY_CITY,
  DELIVERY_CITIES,
  SHIPPING_RATES,
  type DeliveryCity,
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
 * The two price inputs and, right under them, the simulator: margin %, net profit per unit and the
 * break-even price for the chosen delivery region. The numbers are the same `computeMargin` /
 * `breakEvenPrice` the API uses for the table, so what is simulated is what will be listed.
 * `cost` / `price` are minor units, or `null` while the field is empty. The freight choice sits
 * between the inputs and the result because it changes the result: when the merchant pays the
 * delivery, the fee of the region comes off the profit and moves the break-even price up.
 * The region only drives the simulation; the shopper's real province is chosen at checkout.
 */
export function PricingPanel({
  cost,
  price,
  shippingBearer,
  onShippingBearerChange,
  onPriceChange,
  children,
}: {
  cost: number | null;
  price: number | null;
  shippingBearer: ShippingBearer;
  onShippingBearerChange: (bearer: ShippingBearer) => void;
  /** The slider moves the price, in whole Kwanzas, exactly as typing it would. */
  onPriceChange: (kwanza: number) => void;
  children: ReactNode;
}) {
  const t = useTranslations("Catalog.form.pricing");
  const f = useFormatters();
  const [city, setCity] = useState<DeliveryCity>(DEFAULT_DELIVERY_CITY);

  const merchantPays = shippingBearer === "merchant";
  const margin =
    cost !== null && price !== null && price > 0
      ? computeMargin(cost, price, shippingBearer, city)
      : null;
  const loss = margin !== null && margin.amount < 0;
  const breakEven = cost !== null ? breakEvenPrice(cost, shippingBearer, city) : null;
  // The warning follows the worst region, so a price that only loses money in Bengo is still flagged.
  const worstCity = DELIVERY_CITIES.reduce((a, b) =>
    SHIPPING_RATES[b] > SHIPPING_RATES[a] ? b : a
  );
  const belowBreakEven =
    merchantPays &&
    cost !== null &&
    price !== null &&
    price > 0 &&
    price < breakEvenPrice(cost, shippingBearer, worstCity);

  // Slider range in whole Kwanzas: from the break-even to well above it (or the price, if higher).
  const costKz = Math.round((cost ?? 0) / 100);
  const priceKz = Math.round((price ?? 0) / 100);
  const lowKz = Math.max(1, Math.floor(costKz / 2));
  const highKz = Math.max(costKz * 3 + 10_000, priceKz, 1_000);
  const STEP_KZ = 50;

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
        <label
          htmlFor="pricing-simulator"
          className="text-[11px] font-medium tracking-[0.14em] text-ink-muted uppercase"
        >
          {t("simulate")}
        </label>
        <input
          id="pricing-simulator"
          type="range"
          min={lowKz}
          max={highKz}
          step={STEP_KZ}
          value={Math.min(Math.max(priceKz, lowKz), highKz)}
          onChange={(e) => onPriceChange(Number(e.target.value))}
          className="mt-2 h-11 w-full accent-[currentColor]"
        />
        <div className="flex justify-between text-[12px] text-ink-muted tabular-nums">
          <span>{f.money(lowKz * 100)}</span>
          <span>{f.money(highKz * 100)}</span>
        </div>

        <div className="mt-4">
          <label htmlFor="pricing-region" className="text-[13px] text-ink-muted">
            {t("region")}
          </label>
          <select
            id="pricing-region"
            value={city}
            onChange={(e) => setCity(e.target.value as DeliveryCity)}
            className="mt-1 h-11 w-full rounded-md border border-field bg-surface px-3 text-[15px]"
          >
            {DELIVERY_CITIES.map((c) => (
              <option key={c} value={c}>
                {c} · {f.money(SHIPPING_RATES[c])}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 border-t border-line pt-5" aria-live="polite">
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
            <dt className="mt-4 text-[13px] text-ink-muted">{t("commission")}</dt>
            <dd className="font-medium tabular-nums">−{f.money(margin.commission)}</dd>
            {merchantPays && (
              <>
                <dt className="mt-4 text-[13px] text-ink-muted">{t("shippingCost")}</dt>
                <dd className="font-medium tabular-nums">
                  −{f.money(merchantShippingCost(shippingBearer, city))}
                </dd>
              </>
            )}
            {breakEven !== null && (
              <>
                <dt className="mt-4 text-[13px] text-ink-muted">{t("breakEven")}</dt>
                <dd className="font-medium tabular-nums">{f.money(breakEven)}</dd>
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
