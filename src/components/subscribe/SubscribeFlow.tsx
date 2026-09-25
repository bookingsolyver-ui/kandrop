"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useFields } from "@/components/checkout/useFields";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { KandropLogo } from "@/components/receipt/KandropLogo";
import {
  detailsErrors,
  priceMinor,
  type Currency,
  type DetailsCode,
  type DetailsField,
  type SignupPlan,
} from "@/shared/subscribe/schemas";
import { CurrencyToggle } from "./CurrencyToggle";
import { DetailsStep } from "./DetailsStep";
import { OrderSummary } from "./OrderSummary";
import { PaymentStep, type PaidWith } from "./PaymentStep";
import { PlanStep } from "./PlanStep";
import { Stepper } from "./Stepper";
import { SuccessPanel } from "./SuccessPanel";
import { useSubscribeMoney } from "./useSubscribeMoney";

type Step = 1 | 2 | 3;
const H1 =
  "font-serif text-[clamp(1.875rem,4vw,2.75rem)] leading-[1.08] font-normal tracking-[-0.02em] outline-none";

function Flow({ onRestart }: { onRestart: () => void }) {
  const t = useTranslations("Subscribe");
  const money = useSubscribeMoney();
  const [step, setStep] = useState<Step>(1);
  const [plan, setPlan] = useState<SignupPlan | null>(null);
  const [currency, setCurrency] = useState<Currency>("AOA");
  const [paidWith, setPaidWith] = useState<PaidWith | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  // The details live up here so they survive going back and forth between the steps.
  const form = useFields<DetailsField, DetailsCode>(
    { fullName: "", email: "", whatsapp: "", password: "", province: "" },
    detailsErrors,
    "sub"
  );
  const detailsValid = Object.keys(detailsErrors(form.values)).length === 0;
  const reachable: Step = plan ? (detailsValid ? 3 : 2) : 1;

  // A new step is a new screen: bring its title into view and into focus. Only when the step really
  // changed (not on first paint, and not on the second run React's dev mode gives every effect).
  const shown = useRef<Step>(step);
  useEffect(() => {
    if (shown.current === step) return;
    shown.current = step;
    heading.current?.focus();
    heading.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [step]);

  function go(target: Step) {
    if (target <= reachable) setStep(target);
  }

  const summary = plan && (
    <div className="order-first lg:order-none lg:col-start-2 lg:row-start-1">
      <OrderSummary plan={plan} currency={currency} onChange={() => setStep(1)} />
    </div>
  );

  return (
    <div className="marketing min-h-screen bg-page text-ink">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-surface px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t("skip")}
      </a>
      <p className="border-b border-series-2 bg-series-2/10 px-4 py-2.5 text-center text-[13px] leading-snug font-medium">
        {t("banner")}
      </p>

      <header className="border-b border-line">
        {/* On a phone the currency toggle drops to its own row: all three do not fit in one. */}
        <div className="mx-auto flex min-h-16 max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
          <div className="mr-auto">
            <KandropLogo />
          </div>
          <div className="order-last flex w-full justify-end sm:order-none sm:w-auto">
            <CurrencyToggle value={currency} onChange={setCurrency} />
          </div>
          <LocaleSwitcher />
        </div>
      </header>

      <main id="conteudo" className="mx-auto max-w-5xl px-4 pt-8 pb-24 sm:px-6 sm:pt-10">
        {paidWith && plan ? (
          <SuccessPanel
            plan={t(`plan.names.${plan}`)}
            method={paidWith}
            amount={money(priceMinor(plan, currency), currency)}
            onRestart={onRestart}
          />
        ) : (
          <>
            <Stepper step={step} reachable={reachable} onGo={go} />

            <div className="mt-8">
              {step === 1 && (
                <>
                  <h1 ref={heading} tabIndex={-1} className={H1}>
                    {t("plan.title")}
                  </h1>
                  <p className="mt-3 mb-8 text-lg text-ink-2">{t("plan.subtitle")}</p>
                  <PlanStep
                    currency={currency}
                    selected={plan}
                    onChoose={(chosen) => {
                      setPlan(chosen);
                      setStep(2);
                    }}
                  />
                </>
              )}

              {step === 2 && plan && (
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
                  {summary}
                  <section
                    aria-labelledby="details-title"
                    className="lg:col-start-1 lg:row-start-1"
                  >
                    <h1 id="details-title" ref={heading} tabIndex={-1} className={H1}>
                      {t("details.title")}
                    </h1>
                    <p className="mt-3 mb-7 text-ink-2">{t("details.subtitle")}</p>
                    <DetailsStep
                      form={form}
                      onContinue={() => setStep(3)}
                      onBack={() => setStep(1)}
                    />
                  </section>
                </div>
              )}

              {step === 3 && plan && (
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
                  {summary}
                  <section aria-labelledby="pay-title" className="lg:col-start-1 lg:row-start-1">
                    <h1 id="pay-title" ref={heading} tabIndex={-1} className={`${H1} mb-7`}>
                      {t("pay.title")}
                    </h1>
                    <PaymentStep
                      key={currency}
                      plan={plan}
                      currency={currency}
                      onBack={() => setStep(2)}
                      onDone={setPaidWith}
                    />
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

/** The public subscription funnel: plan → details → payment, all in state (no page reloads). */
export function SubscribeFlow() {
  const [run, setRun] = useState(0);
  return <Flow key={run} onRestart={() => setRun((n) => n + 1)} />;
}
