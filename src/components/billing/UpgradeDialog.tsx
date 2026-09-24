"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { PaymentForm } from "@/components/checkout/PaymentForm";
import { SandboxBanner } from "@/components/checkout/CheckoutChrome";
import { PendingPanel } from "@/components/checkout/StatePanels";
import { usePaymentPolling } from "@/components/checkout/usePaymentPolling";
import { CloseIcon } from "@/components/data/icons";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { PLAN_CHANGED } from "@/components/shell/PlanProvider";
import { Link } from "@/i18n/navigation";
import type { ApiErrorCode } from "@/server/http/errors";
import type { BillingOverview, UpgradeSession } from "@/server/modules/billing/schema";
import type { FailureCode, PublicPayment } from "@/server/modules/payments/schema";
import type { PaidPlan } from "@/shared/billing/schemas";
import { startUpgrade } from "./billingApi";

type Phase =
  | { kind: "starting" }
  | { kind: "error"; code: ApiErrorCode }
  | { kind: "form"; session: UpgradeSession; notice?: string }
  | { kind: "pending"; session: UpgradeSession; payment: PublicPayment }
  | { kind: "success"; payment: PublicPayment; periodEnd: string | null };

const primary =
  "flex h-12 items-center justify-center rounded-md bg-action px-6 text-[0.9375rem] font-semibold text-on-action hover:opacity-90";

/**
 * Pays the next 30 days of a plan with the same payment form the buyers use (Multicaixa Express
 * first, then Unitel Money and card), in a centred modal. The checkout session behind it belongs
 * to Kandrop; when the payment is confirmed the plan switches on (server side, in `markPaid`),
 * and this dialog only reports it and asks the page to refresh.
 */
export function UpgradeDialog({
  plan,
  renewing,
  sandbox,
  onPaid,
  onClose,
}: {
  plan: PaidPlan;
  renewing: boolean;
  sandbox: boolean;
  /** Refetch the billing page; resolves with the fresh data. */
  onPaid: () => Promise<BillingOverview | null>;
  onClose: () => void;
}) {
  const t = useTranslations("Billing.dialog");
  const checkout = useTranslations("Checkout");
  const errors = useTranslations("Errors");
  const names = useTranslations("Shell.plan.names");
  const f = useFormatters();
  const format = useFormatter();
  const ref = useRef<HTMLDialogElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "starting" });
  const [cancelling, setCancelling] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // A checkout session per opening and per retry (a spare one from a dev double render is harmless:
  // it becomes an invoice only once someone pays it).
  useEffect(() => {
    let cancelled = false;
    startUpgrade(plan).then((result) => {
      if (cancelled) return;
      setPhase(
        result.ok ? { kind: "form", session: result.data } : { kind: "error", code: result.code }
      );
    });
    return () => {
      cancelled = true;
    };
  }, [plan, attempt]);

  /** Turns a payment (from creating it or from polling) into the next screen. */
  const apply = useCallback(
    (payment: PublicPayment) => {
      if (payment.status === "success") {
        setPhase({ kind: "success", payment, periodEnd: null });
        window.dispatchEvent(new Event(PLAN_CHANGED)); // the sidebar's plan card follows
        void onPaid().then((data) =>
          setPhase((now) =>
            now.kind === "success" ? { ...now, periodEnd: data?.periodEnd ?? null } : now
          )
        );
        return;
      }
      setPhase((now) => {
        if (now.kind !== "form" && now.kind !== "pending") return now;
        const session = now.session;
        if (payment.status === "pending") return { kind: "pending", session, payment };
        const code: FailureCode | "generic" = payment.failureCode ?? "generic";
        return {
          kind: "form",
          session,
          notice: `${checkout("failed.title")} ${checkout(`failed.codes.${code}`)}`,
        };
      });
    },
    [checkout, onPaid]
  );

  usePaymentPolling(phase.kind === "pending" ? phase.payment.id : null, apply);

  async function cancel() {
    if (phase.kind !== "pending") return;
    setCancelling(true);
    try {
      await fetch(`/api/payments/${phase.payment.id}`, { method: "DELETE" });
    } finally {
      setCancelling(false);
      setPhase({ kind: "form", session: phase.session });
    }
  }

  const planName = names(plan);
  const sessionOf = phase.kind === "form" || phase.kind === "pending" ? phase.session : null;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      aria-labelledby="upgrade-title"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-lg border border-line bg-surface p-0 text-ink backdrop:bg-black/60"
    >
      <div className="p-5 sm:p-7">
        <header className="flex items-start justify-between gap-4">
          <h2
            id="upgrade-title"
            className="font-serif text-[1.5rem] leading-tight font-normal tracking-[-0.01em]"
          >
            {t(renewing ? "renewTitle" : "title", { plan: planName })}
          </h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label={t("close")}
            className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-md text-ink-2 hover:text-ink"
          >
            <CloseIcon />
          </button>
        </header>

        {phase.kind === "starting" && (
          <p role="status" className="mt-8 mb-6 text-ink-2">
            {t("preparing")}
          </p>
        )}

        {phase.kind === "error" && (
          <div className="mt-6">
            <p role="alert" className="rounded-md border border-down px-4 py-3 text-sm text-down">
              {t("startError")} {errors(phase.code)}
            </p>
            <button
              type="button"
              onClick={() => {
                setPhase({ kind: "starting" });
                setAttempt((n) => n + 1);
              }}
              className={`${primary} mt-4`}
            >
              {t("retry")}
            </button>
          </div>
        )}

        {sessionOf && (
          <>
            {phase.kind === "form" && (
              <>
                <dl className="mt-6 divide-y divide-line rounded-md border border-line text-sm">
                  {(
                    [
                      [t("plan"), planName],
                      [t("period"), t("days")],
                      [t("total"), f.money(sessionOf.amount)],
                    ] as const
                  ).map(([label, value], i) => (
                    <div key={label} className="flex justify-between gap-4 px-4 py-3">
                      <dt className="text-ink-muted">{label}</dt>
                      <dd className={`tabular-nums ${i === 2 ? "font-semibold" : "font-medium"}`}>
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                {sandbox && (
                  <div className="mt-5 overflow-hidden rounded-md border border-line">
                    <SandboxBanner />
                  </div>
                )}
                <div className="mt-6">
                  <PaymentForm
                    inline
                    sessionId={sessionOf.sessionId}
                    totalLabel={f.money(sessionOf.amount)}
                    notice={phase.notice}
                    onCreated={apply}
                    onBlocked={(code) => setPhase({ kind: "error", code })}
                  />
                </div>
              </>
            )}
            {phase.kind === "pending" && (
              <div className="mt-6">
                <PendingPanel
                  payment={phase.payment}
                  amountLabel={f.money(sessionOf.amount)}
                  storeName="Kandrop"
                  onCancel={cancel}
                  cancelling={cancelling}
                />
              </div>
            )}
          </>
        )}

        {phase.kind === "success" && (
          <div className="mt-6 text-center">
            <span
              aria-hidden
              className="mx-auto mb-5 grid size-14 place-items-center rounded-full border border-current text-up"
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
              <h3 className="font-serif text-[1.5rem] leading-tight">
                {t("successTitle", { plan: planName })}
              </h3>
              <p className="mx-auto mt-3 max-w-sm text-ink-2">
                {phase.periodEnd
                  ? t("successBody", {
                      date: format.dateTime(new Date(phase.periodEnd), { dateStyle: "long" }),
                    })
                  : ""}
              </p>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <Link
                href={{ pathname: "/checkout/receipt", query: { payment: phase.payment.id } }}
                target="_blank"
                className="flex h-12 items-center justify-center rounded-md border border-field px-6 text-[0.9375rem] font-medium hover:bg-ink/5"
              >
                {t("invoice")}
              </Link>
              <button type="button" onClick={() => ref.current?.close()} className={primary}>
                {t("done")}
              </button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
