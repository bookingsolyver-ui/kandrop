import { getLocale, getTranslations } from "next-intl/server";
import { formatKwz } from "@/lib/money";
import { Link } from "@/i18n/navigation";
import { getEnv } from "@/server/config/env";
import { orderPaymentInfo } from "@/server/modules/payments/transfer";
import { ArrowIcon, CheckIcon } from "./icons";

/** A clock, drawn as a plain SVG like the rest of the icons. */
const ClockIcon = () => (
  <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
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

        <ul className="mx-auto mt-14 grid max-w-6xl items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {TIERS.map((tier, i) => {
            const name = t(`plans.${tier.key}.name`);
            const pro = tier.featured === true;
            const elite = tier.key === "elite";
            // The middle card is filled with the brand orange (black text for contrast) and lifted above its neighbours.
            const muted = pro ? "text-black/70" : "text-ink-muted";
            const action = "relative mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold transition-all";
            return (
              <li
                key={tier.key}
                className={`reveal relative flex flex-col rounded-2xl border p-7 sm:p-8 ${
                  pro
                    ? "border-action bg-action text-black shadow-[0_30px_80px_-30px_rgba(255,90,0,0.75)] ring-4 ring-action/25 md:col-span-2 lg:col-span-1 lg:-my-4 lg:py-11"
                    : "border-line bg-surface text-ink"
                }`}
                style={{ "--i": i } as React.CSSProperties}
              >
                {(pro || elite) && (
                  <span
                    className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full px-4 py-1 text-[11px] font-bold tracking-[0.14em] whitespace-nowrap uppercase ${
                      pro ? "bg-black text-white" : "border border-line bg-surface text-ink-2"
                    }`}
                  >
                    {pro ? t("recommended") : t("business")}
                  </span>
                )}

                <h3 className="font-serif text-[1.75rem] leading-none tracking-tight">{name}</h3>
                <p className={`mt-3 text-sm leading-relaxed ${pro ? "text-black/75" : "text-ink-muted"}`}>{t(`plans.${tier.key}.tagline`)}</p>

                <div className="mt-8">
                  <p className={`font-serif leading-none font-extrabold tracking-[-0.03em] tabular-nums ${tier.price === null ? "text-[clamp(1.75rem,2.6vw,2.25rem)] py-[0.55rem]" : "text-[clamp(2.5rem,4vw,3.25rem)]"}`}>
                    {tier.price === null ? t("onRequest") : price(tier.price)}
                  </p>
                  {tier.price !== null && <p className={`mt-1.5 text-sm ${muted}`}>{t("period")}</p>}
                </div>

                {(pro || elite) && (
                  <p className={`mt-5 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-[0.1em] uppercase ${pro ? "bg-black/15 text-black" : "bg-accent/10 text-accent"}`}>
                    <ClockIcon />
                    {t(pro ? "payoutPriority" : "payoutFast")}
                  </p>
                )}

                {elite ? (
                  <a
                    href={contact ?? "mailto:"}
                    {...(contact?.startsWith("https") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className={`${action} border border-[var(--ink-200)] bg-white text-[var(--ink-900)] hover:border-[var(--ink-300)]`}
                  >
                    {t("contact")}
                    <ArrowIcon size={16} />
                  </a>
                ) : pro ? (
                  <Link href="/register" className={`${action} bg-black text-white hover:bg-black/85`}>
                    {t("cta", { plan: name })}
                  </Link>
                ) : (
                  <Link href="/register" className={`${action} border border-[var(--ink-200)] bg-white text-[var(--ink-900)] hover:border-[var(--ink-300)]`}>
                    {t("cta", { plan: name })}
                  </Link>
                )}

                <ul className={`relative mt-8 space-y-3.5 border-t pt-8 text-[0.9375rem] ${pro ? "border-black/20" : "border-line"}`}>
                  {tier.features.map((feature) => (
                    <li key={feature.key} className="flex items-start gap-3">
                      <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${pro ? "bg-black text-accent" : "bg-accent/10 text-accent"}`}>
                        <CheckIcon size={13} />
                      </span>
                      <span className={feature.lead ? "font-semibold" : pro ? "text-black/85" : "text-ink-2"}>
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
