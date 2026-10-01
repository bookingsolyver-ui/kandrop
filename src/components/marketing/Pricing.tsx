import { getLocale, getTranslations } from "next-intl/server";
import { formatKwz } from "@/lib/money";
import { BrandLink } from "@/components/ui/BrandButton";
import { Link } from "@/i18n/navigation";
import { getEnv } from "@/server/config/env";
import { orderPaymentInfo } from "@/server/modules/payments/transfer";
import { CheckIcon } from "./icons";
import { TIERS } from "./tiers";

/** The three plans (Starter, Pro, Elite), priced in Kwanzas from the same constants the billing uses. Elite talks to the team. */
export async function Pricing() {
  const t = await getTranslations("Marketing.pricing");
  const locale = await getLocale();
  const price = (kz: number) => formatKwz(kz * 100, locale); // `kz` is whole Kwanzas
  // Elite is not bought through the checkout: its button opens the support WhatsApp, or the support e-mail, or the support page.
  const whatsapp = orderPaymentInfo().whatsapp;
  const email = getEnv().SUPPORT_EMAIL;
  const contact = whatsapp ? `https://wa.me/244${whatsapp}?text=${encodeURIComponent(t("contactText"))}` : email ? `mailto:${email}?subject=${encodeURIComponent(t("contactText"))}` : null;

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

        <ul className="mx-auto mt-14 grid max-w-6xl items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3">
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
                  <span className="font-serif text-[2.5rem] leading-none font-extrabold tracking-[-0.03em] tabular-nums">
                    {tier.price === null ? t("onRequest") : price(tier.price)}
                  </span>
                  {tier.price !== null && <span className="text-ink-muted">{t("period")}</span>}
                </p>

                {tier.key === "elite" ? (
                  <a
                    href={contact ?? "mailto:"}
                    {...(contact?.startsWith("https") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="relative mt-8 inline-flex h-12 w-full items-center justify-center rounded-xl border border-[var(--ink-200)] bg-white px-6 text-sm font-semibold text-[var(--ink-900)] transition-colors hover:border-[var(--ink-300)]"
                  >
                    {t("contact")}
                  </a>
                ) : tier.featured ? (
                  <BrandLink href="/register" size="md" className="mt-8 w-full">
                    {t("cta", { plan: name })}
                  </BrandLink>
                ) : (
                  <Link
                    href="/register"
                    className="relative mt-8 inline-flex h-12 w-full items-center justify-center rounded-xl border border-[var(--ink-200)] bg-white px-6 text-sm font-semibold text-[var(--ink-900)] transition-colors hover:border-[var(--ink-300)]"
                  >
                    {t("cta", { plan: name })}
                  </Link>
                )}

                <ul className="relative mt-8 space-y-3.5 border-t border-line pt-8 text-[0.9375rem]">
                  {tier.features.map((feature) => (
                    <li key={feature.key} className="flex items-start gap-3">
                      <span className="mt-0.5 text-accent">
                        <CheckIcon />
                      </span>
                      <span className={feature.lead ? "font-semibold text-ink" : "text-ink-2"}>
                        {t(`features.${feature.key}`, { count: feature.count ?? 0 })}
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
