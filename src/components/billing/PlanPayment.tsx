"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { SandboxBanner } from "@/components/checkout/CheckoutChrome";
import { PaymentForm } from "@/components/checkout/PaymentForm";
import { PendingPanel } from "@/components/checkout/StatePanels";
import { usePaymentPolling } from "@/components/checkout/usePaymentPolling";
import { useFormatters } from "@/components/dashboard/useFormatters";
import type { ApiErrorCode } from "@/server/http/errors";
import type { UpgradeSession } from "@/server/modules/billing/schema";
import type { FailureCode, PublicPayment } from "@/server/modules/payments/schema";
import type { PaidPlan } from "@/shared/billing/schemas";
import { startUpgrade } from "./billingApi";

type Phase =
  | { kind: "starting" }
  | { kind: "error"; code: ApiErrorCode }
  | { kind: "form"; session: UpgradeSession; notice?: string }
  | { kind: "pending"; session: UpgradeSession; payment: PublicPayment };

const primary =
  "flex h-12 items-center justify-center rounded-md bg-action px-6 text-[0.9375rem] font-semibold text-on-action hover:opacity-90";

/**
 * Pays the next 30 days of a plan with the same payment form the buyers use (Multicaixa Express
 * first, then Unitel Money and card): it asks the server for a checkout session (owned by Kandrop),
 * shows the summary and the form, waits for a mobile-money confirmation, and calls `onPaid` once
 * with the confirmed payment. The plan itself is switched on by the server, in `markPaid`.
 *
 * Shared by the upgrade dialog (an active account changing plan) and the `/checkout` page (an
 * account held at the payment gate).
 */
export function PlanPayment({
  plan,
  sandbox,
  onPaid,
}: {
  plan: PaidPlan;
  sandbox: boolean;
  onPaid: (payment: PublicPayment) => void;
}) {
  const t = useTranslations("Billing.dialog");
  const checkout = useTranslations("Checkout");
  const errors = useTranslations("Errors");
  const names = useTranslations("Shell.plan.names");
  const f = useFormatters();
  const [phase, setPhase] = useState<Phase>({ kind: "starting" });
  const [cancelling, setCancelling] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // A checkout session per plan and per retry (a spare one from a dev double render is harmless:
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
      if (payment.status === "success") return onPaid(payment);
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

  if (phase.kind === "starting") {
    return (
      <p role="status" className="mt-8 mb-6 text-ink-2">
        {t("preparing")}
      </p>
    );
  }

  if (phase.kind === "error") {
    return (
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
    );
  }

  const { session } = phase;
  if (phase.kind === "pending") {
    return (
      <div className="mt-6">
        <PendingPanel
          payment={phase.payment}
          amountLabel={f.money(session.amount)}
          storeName="Kandrop"
          onCancel={cancel}
          cancelling={cancelling}
        />
      </div>
    );
  }

  return (
    <>
      <dl className="mt-6 divide-y divide-line rounded-md border border-line text-sm">
        {(
          [
            [t("plan"), names(plan)],
            [t("period"), t("days")],
            [t("total"), f.money(session.amount)],
          ] as const
        ).map(([label, value], i) => (
          <div key={label} className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-ink-muted">{label}</dt>
            <dd className={`tabular-nums ${i === 2 ? "font-semibold" : "font-medium"}`}>{value}</dd>
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
          sessionId={session.sessionId}
          totalLabel={f.money(session.amount)}
          notice={phase.notice}
          onCreated={apply}
          onBlocked={(code) => setPhase({ kind: "error", code })}
        />
      </div>
    </>
  );
}
