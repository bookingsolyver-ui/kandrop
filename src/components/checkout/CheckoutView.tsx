"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState, type ReactNode } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { useRouter } from "@/i18n/navigation";
import type { PublicCheckout } from "@/server/modules/checkout/schema";
import type { FailureCode, PublicPayment } from "@/server/modules/payments/schema";
import { CheckoutHeader, SandboxBanner, TrustFooter } from "./CheckoutChrome";
import { OrderSummary } from "./OrderSummary";
import { PaymentForm } from "./PaymentForm";
import { usePaymentPolling } from "./usePaymentPolling";
import { BlockedPanel, PendingPanel, RedirectingPanel } from "./StatePanels";

type Phase =
  | { kind: "form" }
  | { kind: "pending"; payment: PublicPayment }
  | { kind: "redirecting" }
  | { kind: "blocked"; reason: "expired" | "paid" };

export function CheckoutView({
  checkout,
  sandbox,
}: {
  checkout: PublicCheckout;
  sandbox: boolean;
}) {
  const t = useTranslations("Checkout");
  const f = useFormatters();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(
    checkout.status === "open"
      ? { kind: "form" }
      : { kind: "blocked", reason: checkout.status === "paid" ? "paid" : "expired" }
  );
  const [notice, setNotice] = useState<ReactNode>(null);
  const [cancelling, setCancelling] = useState(false);
  const amountLabel = f.money(checkout.total);

  /** Single place that turns a payment (from create or poll) into the next screen. */
  const apply = useCallback(
    (payment: PublicPayment) => {
      if (payment.status === "success") {
        // Paid (a card answers at once, mobile money by webhook): open the receipt page. `replace`,
        // so "back" does not return to a payment form for an order that is already paid.
        setPhase({ kind: "redirecting" });
        return router.replace({ pathname: "/checkout/success", query: { payment: payment.id } });
      }
      if (payment.status === "pending") return setPhase({ kind: "pending", payment });

      const code: FailureCode | "generic" = payment.failureCode ?? "generic";
      setNotice(
        <>
          <strong className="block font-medium">{t("failed.title")}</strong>
          {t(`failed.codes.${code}`)}
        </>
      );
      setPhase({ kind: "form" });
    },
    [t, router]
  );

  usePaymentPolling(phase.kind === "pending" ? phase.payment.id : null, apply);

  async function cancel() {
    if (phase.kind !== "pending") return;
    setCancelling(true);
    try {
      await fetch(`/api/payments/${phase.payment.id}`, { method: "DELETE" });
    } finally {
      setCancelling(false);
      setNotice(null);
      setPhase({ kind: "form" });
    }
  }

  return (
    <div className="min-h-screen pb-28 lg:pb-12">
      <CheckoutHeader storeName={checkout.storeName} />
      {sandbox && <SandboxBanner />}

      <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12 lg:pt-10">
        {phase.kind !== "blocked" && <OrderSummary checkout={checkout} />}

        <section className="lg:col-start-1 lg:row-start-1">
          {phase.kind === "form" && (
            <>
              <h1 className="sr-only lg:not-sr-only lg:mb-6 lg:font-serif lg:text-[2.25rem] lg:leading-tight lg:font-normal lg:tracking-[-0.01em]">
                {t("title")}
              </h1>
              <PaymentForm
                sessionId={checkout.id}
                totalLabel={amountLabel}
                notice={notice}
                onCreated={(payment) => {
                  setNotice(null);
                  apply(payment);
                }}
                onBlocked={(reason) =>
                  setPhase({
                    kind: "blocked",
                    reason: reason === "checkout_paid" ? "paid" : "expired",
                  })
                }
              />
            </>
          )}
          {phase.kind === "pending" && (
            <PendingPanel
              payment={phase.payment}
              amountLabel={amountLabel}
              storeName={checkout.storeName}
              onCancel={cancel}
              cancelling={cancelling}
            />
          )}
          {phase.kind === "redirecting" && <RedirectingPanel />}
          {phase.kind === "blocked" && <BlockedPanel reason={phase.reason} />}

          <TrustFooter />
        </section>
      </main>
    </div>
  );
}
