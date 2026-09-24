import { useFormatter, useTranslations } from "next-intl";
import { COMMISSION_BPS } from "@/shared/affiliates/schemas";

/**
 * The invitation, as the page's heading. Flat and quiet like the rest of the workspace: the
 * one bright thing is the rate itself, set large in the accent — no glow, no gradient.
 */
export function AffiliateHero() {
  const t = useTranslations("Affiliates.hero");
  const format = useFormatter();
  const rate = format.number(COMMISSION_BPS / 10_000, { style: "percent" });

  return (
    <header className="grid gap-8 rounded-lg border border-line bg-surface p-6 sm:p-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-14">
      <div className="max-w-2xl">
        <p className="text-[11px] font-medium tracking-[0.18em] text-accent uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="mt-4 font-serif text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.04] font-normal tracking-[-0.02em] text-balance">
          {t("title")}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-2">{t("body", { rate })}</p>
      </div>
      <div className="border-t border-line pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-14">
        <p className="font-serif text-[clamp(3.5rem,9vw,6rem)] leading-none font-normal tracking-[-0.03em] text-accent tabular-nums">
          {rate}
        </p>
        <p className="mt-3 max-w-[14rem] text-sm leading-snug text-ink-muted">{t("rateCaption")}</p>
      </div>
    </header>
  );
}
