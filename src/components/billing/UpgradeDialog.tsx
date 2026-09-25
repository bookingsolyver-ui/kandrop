"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { CloseIcon } from "@/components/data/icons";
import { PLAN_CHANGED } from "@/components/shell/PlanProvider";
import { Link } from "@/i18n/navigation";
import type { BillingOverview } from "@/server/modules/billing/schema";
import type { PublicPayment } from "@/server/modules/payments/schema";
import type { PaidPlan } from "@/shared/billing/schemas";
import { PlanPayment } from "./PlanPayment";

const primary =
  "flex h-12 items-center justify-center rounded-md bg-action px-6 text-[0.9375rem] font-semibold text-on-action hover:opacity-90";

/**
 * Pays the next 30 days of a plan in a centred modal (an active account renewing or moving up).
 * The payment itself is `PlanPayment`; this shell only frames it and, once paid, reports it and
 * asks the page to refresh.
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
  const names = useTranslations("Shell.plan.names");
  const format = useFormatter();
  const ref = useRef<HTMLDialogElement>(null);
  const [paid, setPaid] = useState<{ payment: PublicPayment; periodEnd: string | null } | null>(
    null
  );

  // Open as a modal on mount (a ref callback: the dialog is in the tree from the first render).
  const open = (dialog: HTMLDialogElement | null) => {
    ref.current = dialog;
    if (dialog && !dialog.open) dialog.showModal();
  };

  function confirmed(payment: PublicPayment) {
    setPaid({ payment, periodEnd: null });
    window.dispatchEvent(new Event(PLAN_CHANGED)); // the sidebar's plan card follows
    void onPaid().then((data) =>
      setPaid((now) => (now ? { ...now, periodEnd: data?.periodEnd ?? null } : now))
    );
  }

  const planName = names(plan);

  return (
    <dialog
      ref={open}
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

        {paid ? (
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
                {paid.periodEnd
                  ? t("successBody", {
                      date: format.dateTime(new Date(paid.periodEnd), { dateStyle: "long" }),
                    })
                  : ""}
              </p>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <Link
                href={{ pathname: "/checkout/receipt", query: { payment: paid.payment.id } }}
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
        ) : (
          <PlanPayment plan={plan} sandbox={sandbox} onPaid={confirmed} />
        )}
      </div>
    </dialog>
  );
}
