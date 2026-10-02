"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useLogout } from "@/components/auth/useLogout";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { KandropLogo } from "@/components/receipt/KandropLogo";
import { useRouter } from "@/i18n/navigation";
import type { PlanKey } from "@/server/modules/plan/limits";
import type { BankDetailsData } from "./BankDetails";
import { OrderSummary } from "./OrderSummary";
import { PlanStep } from "./PlanStep";
import { RequestStep } from "./RequestStep";
import { Stepper, type StepId } from "./Stepper";

const H1 =
  "font-serif text-[clamp(1.875rem,4vw,2.75rem)] leading-[1.08] font-normal tracking-[-0.02em] outline-none";

/**
 * THE PAYMENT GATE'S DOOR. Where an account with nothing paid lands (after sign-up, after a sign-in, or when it tries to open the
 * dashboard): choose a plan and submit the request. Two steps, all in state. The request is saved as PENDING; the page then shows
 * the "waiting for approval" screen until the team confirms the payment and approves it.
 */
export function SubscribeFlow({ email, intro, transfer }: { email: string; intro: boolean; transfer: BankDetailsData | null }) {
  const t = useTranslations("Subscribe");
  const router = useRouter();
  const { logout, pending: leaving } = useLogout();
  const [step, setStep] = useState<StepId>("plan");
  const [plan, setPlan] = useState<PlanKey | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const shown = useRef<StepId>(step);

  // A new step is a new screen: bring its title into view and into focus (only when it really changed).
  useEffect(() => {
    if (shown.current === step) return;
    shown.current = step;
    heading.current?.focus();
    heading.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [step]);

  return (
    <div className="marketing min-h-screen bg-page text-ink">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-surface px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t("skip")}
      </a>
      <p className="border-b border-accent/40 bg-accent/10 px-4 py-2.5 text-center text-[13px] leading-snug font-medium">
        {t("gate.banner")}
      </p>

      <header className="border-b border-line">
        <div className="mx-auto flex min-h-16 max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <div className="mr-auto">
            <KandropLogo />
          </div>
          <p className="hidden min-w-0 truncate text-[13px] text-ink-muted md:block">
            {t("gate.signedIn", { email })}
          </p>
          <button
            type="button"
            onClick={logout}
            disabled={leaving}
            className="min-h-11 rounded px-1 text-sm text-ink-2 underline underline-offset-4 hover:text-ink"
          >
            {t("gate.logout")}
          </button>
          <LocaleSwitcher />
        </div>
      </header>

      <main id="conteudo" className="mx-auto max-w-5xl px-4 pt-8 pb-24 sm:px-6 sm:pt-10">
        {(
          <>
            <Stepper current={step} reachable={plan ? "payment" : "plan"} onGo={setStep} />

            <div className="mt-8">
              {step === "plan" && (
                <>
                  <h1 ref={heading} tabIndex={-1} className={H1}>
                    {t("plan.title")}
                  </h1>
                  <p className="mt-3 mb-8 text-lg text-ink-2">{t("plan.subtitle")}</p>
                  <PlanStep
                    intro={intro}
                    selected={plan}
                    onChoose={(chosen) => {
                      setPlan(chosen);
                      setStep("payment");
                    }}
                  />
                </>
              )}

              {step === "payment" && plan && (
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
                  <div className="order-first lg:order-none lg:col-start-2 lg:row-start-1">
                    <OrderSummary intro={intro} plan={plan} onChange={() => setStep("plan")} />
                  </div>
                  <section aria-labelledby="pay-title" className="lg:col-start-1 lg:row-start-1">
                    <h1 id="pay-title" ref={heading} tabIndex={-1} className={H1}>
                      {t("pay.title")}
                    </h1>
                    <RequestStep plan={plan} transfer={transfer} onSubmitted={() => router.refresh()} />
                    <button
                      type="button"
                      onClick={() => setStep("plan")}
                      className="mt-6 min-h-11 rounded px-1 text-sm text-ink-2 underline underline-offset-4 hover:text-ink"
                    >
                      {t("pay.back")}
                    </button>
                  </section>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
