"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { TransferInfo } from "@/server/modules/payments/transfer";
import { BankIcon } from "./icons";

/** `AO06 0000 0000 0000 0000 0000 0`: an IBAN in groups of four. */
export const formatIban = (iban: string) => iban.replace(/(.{4})/g, "$1 ").trim();

/** `+244 923 456 789` for reading, `244923456789` for a WhatsApp link. */
export const whatsappDisplay = (national: string) =>
  `+244 ${national.replace(/(\d{3})(?=\d)/g, "$1 ")}`;
export const whatsappLink = (national: string, text: string) =>
  `https://wa.me/244${national}?text=${encodeURIComponent(text)}`;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 font-medium tabular-nums">{children}</dd>
    </div>
  );
}

/**
 * The account to transfer to (bank, holder, account, IBAN), the amount, and the notice that tells
 * the payer what to do next: transfer, then send the proof to the support WhatsApp. When the
 * details are the sandbox EXAMPLE they say so, in plain sight.
 */
export function TransferPanel({
  info,
  amountLabel,
  whatsappText,
}: {
  info: TransferInfo;
  amountLabel: string;
  /** What the WhatsApp message starts with (already translated). */
  whatsappText: string;
}) {
  const t = useTranslations("Checkout.transfer");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(info.iban);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the IBAN is on screen to copy by hand */
    }
  }

  return (
    <div className="mt-5 space-y-4">
      <p className="flex items-start gap-3 text-sm leading-snug text-ink-2">
        <span className="mt-0.5 text-ink-muted">
          <BankIcon size={18} />
        </span>
        {t("intro")}
      </p>

      <dl className="divide-y divide-line rounded-md border border-line text-sm">
        <Row label={t("bank")}>{info.bank}</Row>
        <Row label={t("holder")}>{info.holder}</Row>
        <Row label={t("account")}>{info.account}</Row>
        <Row label={t("iban")}>
          <span className="flex flex-wrap items-center justify-end gap-x-3">
            <span className="font-mono text-[15px] tracking-wide break-all">
              {formatIban(info.iban)}
            </span>
            <button
              type="button"
              onClick={copy}
              className="min-h-11 rounded px-1 text-[13px] font-normal text-accent underline underline-offset-4 hover:opacity-80"
            >
              {copied ? t("copied") : t("copy")}
            </button>
          </span>
        </Row>
        <Row label={t("amount")}>
          <span className="text-[1.0625rem] font-semibold">{amountLabel}</span>
        </Row>
      </dl>

      {info.example && (
        <p className="rounded-md border border-series-2 px-4 py-3 text-[13px] leading-snug">
          {t("example")}
        </p>
      )}

      <div role="note" className="rounded-md border border-accent/50 bg-accent/5 px-4 py-3">
        <p className="text-sm font-semibold">{t("warningTitle")}</p>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-2">
          {t("warning", { phone: whatsappDisplay(info.whatsapp) })}
        </p>
        <a
          href={whatsappLink(info.whatsapp, whatsappText)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-11 items-center rounded-md border border-accent/70 px-4 text-sm font-medium text-accent hover:bg-accent/10"
        >
          {t("whatsapp")}
        </a>
      </div>
    </div>
  );
}
