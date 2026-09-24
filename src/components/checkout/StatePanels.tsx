"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { LockIcon, PhoneIcon } from "./icons";
import { Spinner } from "./Spinner";
import type { PublicCheckout } from "@/server/modules/checkout/schema";
import type { PublicPayment } from "@/server/modules/payments/schema";

function Panel({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-6 text-center sm:p-10">
      {children}
    </section>
  );
}

/** Icon in a ring: shape (tick / clock / cross) carries meaning, colour only reinforces it. */
function Badge({ kind }: { kind: "success" | "wait" | "fail" }) {
  const tone = kind === "success" ? "text-up" : kind === "fail" ? "text-down" : "text-ink-2";
  return (
    <span
      aria-hidden
      className={`mx-auto mb-5 grid size-14 place-items-center rounded-full border border-current ${tone}`}
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
        {kind === "success" && <path d="M6 12.5l4 4 8-9" />}
        {kind === "fail" && <path d="M7 7l10 10M17 7 7 17" />}
        {kind === "wait" && (
          <>
            <circle cx="12" cy="12" r="8" />
            <path d="M12 7.5V12l3 2" />
          </>
        )}
      </svg>
    </span>
  );
}

const title = "font-serif text-[1.75rem] leading-tight font-normal tracking-[-0.01em]";

/** Session expired / already paid / not found. */
export function BlockedPanel({ reason }: { reason: "expired" | "paid" | "notFound" }) {
  const t = useTranslations("Checkout.states");
  return (
    <Panel>
      <Badge kind={reason === "paid" ? "success" : "wait"} />
      <h1 className={title}>{t(`${reason}.title`)}</h1>
      <p className="mt-2 text-ink-2">{t(`${reason}.body`)}</p>
    </Panel>
  );
}

/**
 * Waiting for the payer to approve in their mobile-money app. It says exactly what to do (three
 * steps), repeats what is being paid and to whom, and never asks for anything on this page.
 */
export function PendingPanel({
  payment,
  amountLabel,
  storeName,
  onCancel,
  cancelling,
}: {
  payment: PublicPayment;
  amountLabel: string;
  storeName: string;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const t = useTranslations("Checkout");
  const app = t(`method.${payment.method}.name`);
  const heading = useRef<HTMLHeadingElement>(null);

  // A new screen: put focus on its title so keyboard and screen-reader users start here.
  useEffect(() => heading.current?.focus(), []);

  const values = { app, amount: amountLabel, store: storeName, phone: payment.target };
  const rows: Array<[string, string]> = [
    [t("pending.receipt.amount"), amountLabel],
    [t("pending.receipt.store"), storeName],
    [t("pending.receipt.phone"), payment.target],
    [t("pending.receipt.reference"), payment.reference],
  ];

  return (
    <Panel>
      <Spinner>
        <PhoneIcon size={30} />
      </Spinner>

      <div role="status" aria-live="polite">
        <h1 ref={heading} tabIndex={-1} className={`${title} outline-none`}>
          {t("pending.title", values)}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-ink-2">{t("pending.body", values)}</p>
      </div>

      <ol className="mx-auto mt-7 max-w-sm space-y-3 text-left text-sm">
        {(["open", "check", "approve"] as const).map((step, i) => (
          <li key={step} className="flex gap-3">
            <span
              aria-hidden
              className="grid size-6 shrink-0 place-items-center rounded-full border border-field text-[12px] text-ink-2 tabular-nums"
            >
              {i + 1}
            </span>
            <span className="pt-0.5 text-ink-2">{t(`pending.steps.${step}`, values)}</span>
          </li>
        ))}
      </ol>

      <dl className="mx-auto mt-7 max-w-sm divide-y divide-line border-y border-line text-left text-[13px]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-6 py-2.5">
            <dt className="text-ink-muted">{label}</dt>
            <dd className="text-right font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mx-auto mt-5 flex max-w-sm items-start justify-center gap-2 text-left text-[13px] leading-snug text-ink-muted">
        <span className="mt-0.5">
          <LockIcon />
        </span>
        {t("trust.noPin")}
      </p>
      <p className="mt-2 text-[13px] text-ink-muted">{t("pending.waiting")}</p>

      <button
        type="button"
        onClick={onCancel}
        disabled={cancelling}
        className="mt-6 min-h-11 rounded-md px-3 text-sm text-ink-2 underline underline-offset-4 hover:text-ink disabled:opacity-60"
      >
        {t("pending.cancel")}
      </button>
    </Panel>
  );
}

/** Shown for the instant between "paid" and the receipt page opening. */
export function RedirectingPanel() {
  const t = useTranslations("Checkout.redirecting");
  return (
    <Panel>
      <div role="status" aria-live="polite">
        <Badge kind="success" />
        <h1 className={title}>{t("title")}</h1>
        <p className="mt-2 text-ink-2">{t("body")}</p>
      </div>
    </Panel>
  );
}

export function SuccessPanel({
  payment,
  checkout,
}: {
  payment: PublicPayment;
  checkout: PublicCheckout;
}) {
  const t = useTranslations("Checkout");
  const f = useFormatters();
  const format = useFormatter();
  const rows: Array<[string, string]> = [
    [t("success.reference"), payment.reference],
    [t("success.method"), `${t(`method.${payment.method}.name`)} · ${payment.target}`],
    [t("success.store"), checkout.storeName],
    [
      t("success.date"),
      format.dateTime(new Date(payment.paidAt ?? payment.createdAt), {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    ],
  ];

  return (
    <Panel>
      <div role="status" aria-live="polite">
        <Badge kind="success" />
        <h1 className={title}>{t("success.title")}</h1>
        <p className="mt-2 text-ink-2">
          {t("success.body", { amount: f.money(payment.amount.amount) })}
        </p>
      </div>

      <dl className="mt-8 divide-y divide-line border-y border-line text-left text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-6 py-3">
            <dt className="text-ink-muted">{label}</dt>
            <dd className="text-right font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 text-[13px] leading-relaxed text-ink-muted">{t("success.keep")}</p>
      <Link
        href={{ pathname: "/checkout/receipt", query: { payment: payment.id } }}
        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md bg-action px-6 font-semibold text-on-action hover:opacity-90 sm:w-auto"
      >
        {t("success.receipt")}
      </Link>
    </Panel>
  );
}
