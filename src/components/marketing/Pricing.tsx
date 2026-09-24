import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CheckIcon } from "./icons";
import { TIERS } from "./tiers";

/** Three tiers, priced in Kwanzas. Prices are placeholders: see the warning in `tiers.ts`. */
export async function Pricing() {
  const t = await getTranslations("Marketing.pricing");
  const format = await getFormatter();
  const price = (kz: number) =>
    format.number(kz, {
      style: "currency",
      currency: "AOA",
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    });

  return (
    <section id="planos" aria-labelledby="pricing-title" className="border-t border-line">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="reveal mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-medium tracking-[0.18em] text-accent uppercase">
            {t("eyebrow")}
          </p>
          <h2
            id="pricing-title"
            className="mt-4 font-serif text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[1.05] font-normal tracking-[-0.02em] text-balance"
          >
            {t("title")}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-2">{t("subtitle")}</p>
        </div>

        <ul className="mt-14 grid items-stretch gap-5 lg:grid-cols-3">
          {TIERS.map((tier, i) => {
            const name = t(`plans.${tier.key}.name`);
            return (
              <li
                key={tier.key}
                className={`reveal relative flex flex-col overflow-hidden rounded-2xl border p-7 sm:p-8 ${
                  tier.featured ? "border-accent bg-surface" : "border-line bg-surface"
                }`}
                style={{ "--i": i } as React.CSSProperties}
              >
                {tier.featured && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(60%_100%_at_50%_0%,var(--glow),transparent)]"
                  />
                )}
                <div className="relative flex items-center justify-between gap-3">
                  <h3 className="font-serif text-[1.625rem] leading-none tracking-tight">{name}</h3>
                  {tier.featured && (
                    <span className="rounded-full bg-accent px-3 py-1 text-[11px] font-semibold tracking-[0.1em] text-on-action uppercase">
                      {t("recommended")}
                    </span>
                  )}
                </div>
                <p className="relative mt-3 text-ink-2">{t(`plans.${tier.key}.tagline`)}</p>

                <p className="relative mt-8 flex items-baseline gap-2">
                  <span className="font-serif text-[3rem] leading-none tracking-[-0.02em] tabular-nums">
                    {tier.price === 0 ? t("free") : price(tier.price)}
                  </span>
                  {tier.price > 0 && <span className="text-ink-muted">{t("period")}</span>}
                </p>

                <Link
                  href="/register"
                  className={`relative mt-8 inline-flex h-12 items-center justify-center rounded-md px-6 text-[0.9375rem] font-semibold transition-opacity hover:opacity-90 ${
                    tier.featured
                      ? "bg-accent text-on-action"
                      : "border border-field text-ink hover:bg-ink/5"
                  }`}
                >
                  {t("cta", { plan: name })}
                </Link>

                <ul className="relative mt-8 space-y-3.5 border-t border-line pt-8 text-[0.9375rem]">
                  {tier.features.map((feature) => (
                    <li key={feature.key} className="flex items-start gap-3">
                      <span className="mt-0.5 text-accent">
                        <CheckIcon />
                      </span>
                      <span className="text-ink-2">
                        {t(`features.${feature.key}`, { count: feature.count ?? 0 })}
                        {feature.soon && (
                          <span className="ml-2 rounded-full border border-line px-2 py-px text-[10px] font-medium tracking-wide whitespace-nowrap text-ink-muted uppercase">
                            {t("soon")}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>

        <p className="mt-8 text-center text-sm text-ink-muted">{t("note")}</p>
      </div>
    </section>
  );
}
