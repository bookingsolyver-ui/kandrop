"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { PlanPayment } from "@/components/billing/PlanPayment";
import { useLogout } from "@/components/auth/useLogout";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { KandropLogo } from "@/components/receipt/KandropLogo";
import { useRouter } from "@/i18n/navigation";
import type { PlanKey } from "@/server/modules/plan/limits";
import { OrderSummary } from "./OrderSummary";
import { PlanStep } from "./PlanStep";
import { Stepper, type StepId } from "./Stepper";

const H1 =
  "font-serif text-[clamp(1.875rem,4vw,2.75rem)] leading-[1.08] font-normal tracking-[-0.02em] outline-none";

/** How long the confirmation stays on screen before the dashboard opens by itself. */
const REDIRECT_MS = 2200;

/**
 * THE PAYMENT GATE'S DOOR. Where an account with nothing paid lands (after sign-up, after a sign-in,
 * or when it tries to open the dashboard): choose a plan, pay, and the dashboard opens. Two steps,
 * all in state (no page reloads). The payment is the real (sandbox) one — the same as the
 * billing page — so confirming it activates the plan on the server and lifts the gate.
 */
export function SubscribeFlow({ email, sandbox }: { email: string; sandbox: boolean }) {
  const t = useTranslations("Subscribe");
  const names = useTranslations("Shell.plan.names");
  const router = useRouter();
  const { logout, pending: leaving } = useLogout();
  const [step, setStep] = useState<StepId>("plan");
  const [plan, setPlan] = useState<PlanKey | null>(null);
  const [paid, setPaid] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const shown = useRef<StepId>(step);

  // A new step is a new screen: bring its title into view and into focus (only when it really changed).
  useEffect(() => {
    if (shown.current === step) return;
    shown.current = step;
    heading.current?.focus();
    heading.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [step]);

  // Paid: the gate is open now. Give the confirmation a moment, then go in.
  useEffect(() => {
    if (!paid) return;
    const timer = setTimeout(() => {
      router.replace("/dashboard");
      router.refresh();
    }, REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [paid, router]);

  const goToDashboard = () => {
    router.replace("/dashboard");
    router.refresh();
  };

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
        {paid && plan ? (
          <section className="mx-auto max-w-xl rounded-lg border border-line bg-surface p-8 text-center sm:p-10">
            <span
              aria-hidden
              className="mx-auto mb-5 grid size-14 place-items-center rounded-full border border-accent text-accent"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 12.5l4 4 8-9" />
              </svg>
            </span>
            <div role="status">
              <h1 className="font-serif text-[1.75rem] leading-tight">{t("success.title")}</h1>
              <p className="mx-auto mt-3 max-w-sm text-ink-2">
                {t("success.body", { plan: names(plan) })}
              </p>
            </div>
            <button
              type="button"
              onClick={goToDashboard}
              className="mt-7 h-12 rounded-md bg-action px-8 text-[0.9375rem] font-semibold text-on-action hover:opacity-90"
            >
              {t("success.go")}
            </button>
          </section>
        ) : (
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
                    <OrderSummary plan={plan} onChange={() => setStep("plan")} />
                  </div>
                  <section aria-labelledby="pay-title" className="lg:col-start-1 lg:row-start-1">
                    <h1 id="pay-title" ref={heading} tabIndex={-1} className={H1}>
                      {t("pay.title")}
                    </h1>
                    <PlanPayment
                      key={plan}
                      plan={plan}
                      sandbox={sandbox}
                      onPaid={() => setPaid(true)}
                    />
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
