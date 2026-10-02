"use client";

import WaitlistForm from "@/waitlist/components/WaitlistForm";
import Countdown from "@/waitlist/components/Countdown";
import { KandropButton } from "@/waitlist/components/ui/KandropButton";
import { copy, BRAND } from "@/waitlist/lib/copy";
import { useLaunchMode } from "@/waitlist/components/LaunchModeProvider";

/**
 * FR-09 — CTA final. Fundo preto, mesma instância de formulário em vidro escuro,
 * com countdown e estado de lançamento.
 */
export default function FinalCta() {
  const mode = useLaunchMode();
  const isLaunched = mode === "launched";

  return (
    <section id="cta-final" className="relative overflow-hidden bg-brand-black">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgb(255_90_0_/_0.08),transparent_70%)]" />

      <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-24 text-center sm:py-32">
        <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-brand-white sm:text-4xl">
          {copy.finalCta.title}
        </h2>

        {!isLaunched && (
          <div className="mt-4">
            <Countdown />
          </div>
        )}

        {isLaunched && (
          <p className="mt-4 text-xl font-medium text-brand-orange">
            {copy.launched.badge.replace("{brand}", BRAND)}
          </p>
        )}

        {!isLaunched && (
          <div className="glass mt-10 w-full max-w-md rounded-2xl p-6 text-left sm:p-8">
            <WaitlistForm />
          </div>
        )}

        {isLaunched && process.env.NEXT_PUBLIC_MARKETPLACE_URL && (
          <div className="mt-10 flex justify-center w-full">
            <KandropButton
              label={copy.launched.cta.replace("{brand}", BRAND)}
              href={process.env.NEXT_PUBLIC_MARKETPLACE_URL}
              size="lg"
            />
          </div>
        )}
      </div>
    </section>
  );
}