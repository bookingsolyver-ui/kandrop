"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import type { PublicPayment } from "@/server/modules/payments/schema";
import type { TransferInfo } from "@/server/modules/payments/transfer";
import { BankIcon } from "./icons";
import { Spinner } from "./Spinner";
import { formatIban, whatsappDisplay, whatsappLink } from "./TransferPanel";

/**
 * After "Confirm transfer": the request is registered and NOTHING is active yet. It repeats what
 * the payer still has to do (send the proof to the support WhatsApp, quoting the reference), and
 * waits — the page keeps asking the server, and moves on by itself once the transfer is validated.
 */
export function TransferPendingPanel({
  payment,
  info,
  amountLabel,
  planName,
  onCancel,
  cancelling,
}: {
  payment: PublicPayment;
  info: TransferInfo;
  amountLabel: string;
  planName: string;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const t = useTranslations("Checkout.transfer");
  const heading = useRef<HTMLHeadingElement>(null);
  // A new screen: put focus on its title so keyboard and screen-reader users start here.
  useEffect(() => heading.current?.focus(), []);

  const message = t("whatsappMessage", {
    amount: amountLabel,
    plan: planName,
    reference: payment.reference,
  });

  return (
    <section className="rounded-lg border border-line bg-surface p-6 text-center sm:p-10">
      <Spinner>
        <BankIcon size={30} />
      </Spinner>

      <div role="status" aria-live="polite">
        <h1
          ref={heading}
          tabIndex={-1}
          className="font-serif text-[1.75rem] leading-tight font-normal tracking-[-0.01em] outline-none"
        >
          {t("pendingTitle")}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-ink-2">
          {t("pendingBody", { amount: amountLabel })}
        </p>
      </div>

      <dl className="mx-auto mt-6 max-w-sm divide-y divide-line rounded-md border border-line text-left text-sm">
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-ink-muted">{t("reference")}</dt>
          <dd className="font-mono font-semibold tracking-wide">{payment.reference}</dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-ink-muted">{t("iban")}</dt>
          <dd className="font-mono text-[13px] break-all">{formatIban(info.iban)}</dd>
        </div>
      </dl>
      <p className="mx-auto mt-2 max-w-sm text-[13px] text-ink-muted">{t("referenceHint")}</p>

      <a
        href={whatsappLink(info.whatsapp, message)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 flex h-12 items-center justify-center rounded-md bg-action px-6 text-[0.9375rem] font-semibold text-on-action hover:opacity-90"
      >
        {t("whatsapp")} · {whatsappDisplay(info.whatsapp)}
      </a>

      <p className="mt-5 text-sm text-ink-2">{t("waiting")}</p>
      {info.example && <p className="mt-2 text-[13px] text-series-2">{t("sandboxNote")}</p>}

      <button
        type="button"
        onClick={onCancel}
        disabled={cancelling}
        className="mt-6 min-h-11 rounded px-1 text-sm text-ink-2 underline underline-offset-4 hover:text-ink"
      >
        {t("back")}
      </button>
    </section>
  );
}
