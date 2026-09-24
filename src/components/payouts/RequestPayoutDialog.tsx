"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useFields, type FieldErrors } from "@/components/checkout/useFields";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { TextField } from "@/components/form/Fields";
import { useCurrencySymbol } from "@/components/products/useCurrencySymbol";
import type { ApiErrorCode } from "@/server/http/errors";
import type { PublicBankAccount } from "@/server/modules/bank/schema";
import type { PublicPayout } from "@/server/modules/payouts/schema";
import { createPayoutSchema, type PayoutValidationCode } from "@/shared/payouts/schemas";
import { requestPayout } from "./payoutsApi";

/** Whole Kwanzas typed by the merchant → minor units; `undefined` while empty. */
const toMinor = (kwanza: string) => (kwanza === "" ? undefined : Number(kwanza) * 100);
const formatKwanza = (raw: string) =>
  raw
    .replace(/\D/g, "")
    .slice(0, 9)
    .replace(/^0+(?=\d)/, "");

/**
 * The payout request: where it goes, how much, one confirmation. A native `<dialog>` (focus trap,
 * Esc, backdrop). The server re-checks everything; this only spares the round trip.
 */
export function RequestPayoutDialog({
  open,
  available,
  minAmount,
  bank,
  onClose,
  onCreated,
}: {
  open: boolean;
  available: number;
  minAmount: number;
  bank: PublicBankAccount;
  onClose: () => void;
  onCreated: (payout: PublicPayout) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      aria-labelledby="payout-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-line bg-surface p-0 text-ink backdrop:bg-black/50"
    >
      {/* Mounted only while open: closing throws the form away, so nothing stale is reused. */}
      {open && (
        <PayoutForm
          available={available}
          minAmount={minAmount}
          bank={bank}
          onCancel={() => ref.current?.close()}
          onCreated={onCreated}
        />
      )}
    </dialog>
  );
}

function PayoutForm({
  available,
  minAmount,
  bank,
  onCancel,
  onCreated,
}: {
  available: number;
  minAmount: number;
  bank: PublicBankAccount;
  onCancel: () => void;
  onCreated: (payout: PublicPayout) => void;
}) {
  const t = useTranslations("Payouts.dialog");
  const validation = useTranslations("Payouts.validation");
  const errors = useTranslations("Errors");
  const f = useFormatters();
  const currency = useCurrencySymbol();
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<ApiErrorCode | null>(null);

  const form = useFields<"amount", PayoutValidationCode>(
    { amount: "" },
    (values) => {
      const parsed = createPayoutSchema.safeParse({ amount: toMinor(values.amount) });
      if (!parsed.success) {
        return { amount: parsed.error.issues[0]!.message as PayoutValidationCode };
      }
      return parsed.data.amount > available ? { amount: "amount_too_high" } : {};
    },
    "po"
  );

  const amount = form.values.amount;
  const errorCode = form.errorFor("amount");
  const message = errorCode ? validation(errorCode, { min: f.money(minAmount) }) : undefined;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setFormError(null);
    if (!form.attempt(["amount"])) return;

    setPending(true);
    const result = await requestPayout({ amount: toMinor(amount)! });
    setPending(false);

    if (result.ok) return onCreated(result.data);
    if (result.code === "validation_failed" && result.fieldErrors.amount) {
      return form.setServerErrors(
        result.fieldErrors as FieldErrors<"amount", PayoutValidationCode>
      );
    }
    setFormError(result.code);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="p-6">
      <h2 id="payout-title" className="font-serif text-[1.5rem] leading-tight font-medium">
        {t("title")}
      </h2>

      <div className="mt-4 rounded-md border border-line bg-page px-4 py-3 text-sm">
        <p className="text-[11px] font-medium tracking-[0.14em] text-ink-muted uppercase">
          {t("to")}
        </p>
        <p className="mt-1 font-medium">{bank.holderName}</p>
        <p className="tabular-nums text-ink-2">{bank.ibanMasked}</p>
      </div>

      {formError && (
        <p role="alert" className="mt-4 text-sm text-down">
          {errors(formError)}
        </p>
      )}

      <div className="mt-5">
        <TextField
          {...form.bind("amount", formatKwanza)}
          label={t("amount")}
          hint={
            amount
              ? f.money(Number(amount) * 100)
              : `${t("available", { amount: f.money(available) })} · ${t("min", { amount: f.money(minAmount) })}`
          }
          error={message}
          suffix={currency}
          inputMode="numeric"
          autoComplete="off"
          maxLength={9}
          placeholder="0"
          numeric
        />
        <button
          type="button"
          onClick={() =>
            form.bind("amount", formatKwanza).onChange({
              target: { value: String(Math.floor(available / 100)) },
            })
          }
          className="mt-2 min-h-11 rounded px-1 text-sm text-ink-2 underline underline-offset-4 hover:text-ink"
        >
          {t("all")}
        </button>
      </div>

      <p className="mt-2 text-[13px] leading-snug text-ink-muted">{t("sandbox")}</p>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="h-12 rounded-md border border-field px-5 font-medium hover:bg-page disabled:opacity-60 sm:h-11"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="h-12 rounded-md bg-action px-6 font-semibold text-on-action hover:opacity-90 disabled:cursor-progress disabled:opacity-70 sm:h-11"
        >
          {pending ? t("submitting") : t("submit")}
        </button>
      </div>
    </form>
  );
}
