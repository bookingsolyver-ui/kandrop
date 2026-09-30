import { getTranslations } from "next-intl/server";
import { BrandLink } from "@/components/ui/BrandButton";
import { ArrowIcon } from "./icons";

export async function FinalCta() {
  const t = await getTranslations("Marketing.final");
  return (
    <section aria-labelledby="final-title" className="border-t border-line">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="reveal relative overflow-hidden rounded-2xl border border-[var(--ink-200)] bg-white px-6 py-16 text-center sm:px-12 sm:py-24">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_50%_120%,var(--glow),transparent)]"
          />
          <h2
            id="final-title"
            className="relative mx-auto max-w-3xl font-serif text-[clamp(2.25rem,5vw,4rem)] leading-[1.05] font-normal tracking-[-0.02em] text-balance"
          >
            {t("title")}
          </h2>
          <p className="relative mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink-2">
            {t("body")}
          </p>
          <BrandLink href="/register" size="lg" className="mt-10 px-9">
            {t("cta")}
            <ArrowIcon />
          </BrandLink>
        </div>
      </div>
    </section>
  );
}
