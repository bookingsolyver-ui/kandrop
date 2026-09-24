"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { ApiErrorCode } from "@/server/http/errors";
import type { PublicPayment } from "@/server/modules/payments/schema";
import {
  cardBrand,
  cardSchema,
  firstError,
  isMobileMethod,
  MOBILE_METHODS,
  phoneSchema,
  type PaymentMethod,
} from "@/shared/checkout/schemas";
import { CheckoutField } from "./CheckoutField";
import { formatCardNumber, formatCvc, formatExpiry, formatPhone } from "./formatInput";
import { LockIcon } from "./icons";
import { MethodRow, MethodTile } from "./MethodOptions";
import { useFields, type FieldErrors } from "./useFields";
import { useIsHttps } from "./useIsHttps";

type Field = "phone" | "cardNumber" | "expiry" | "cvc" | "cardName";

const CARD_TO_FIELD = {
  number: "cardNumber",
  expiry: "expiry",
  cvc: "cvc",
  name: "cardName",
} as const;

const BRAND_LABEL = { visa: "Visa", mastercard: "Mastercard", amex: "Amex", unknown: "" } as const;

function validate(method: PaymentMethod, values: Record<Field, string>): FieldErrors<Field> {
  const errors: FieldErrors<Field> = {};
  if (isMobileMethod(method)) {
    const r = phoneSchema.safeParse(values.phone);
    if (!r.success) errors.phone = r.error.issues[0]!.message as FieldErrors<Field>["phone"];
    return errors;
  }
  const r = cardSchema.safeParse({
    number: values.cardNumber,
    expiry: values.expiry,
    cvc: values.cvc,
    name: values.cardName,
  });
  if (!r.success) {
    for (const [key, code] of Object.entries(firstError(r.error.issues))) {
      errors[CARD_TO_FIELD[key as keyof typeof CARD_TO_FIELD]] = code;
    }
  }
  return errors;
}

interface PaymentFormProps {
  sessionId: string;
  totalLabel: string;
  /** Message shown above the form after a failed attempt. */
  notice?: ReactNode;
  /** Inside a dialog: the pay button stays in the flow instead of being pinned to the screen. */
  inline?: boolean;
  onCreated: (payment: PublicPayment) => void;
  onBlocked: (reason: "checkout_expired" | "checkout_paid") => void;
}

export function PaymentForm({
  sessionId,
  totalLabel,
  notice,
  inline = false,
  onCreated,
  onBlocked,
}: PaymentFormProps) {
  const t = useTranslations("Checkout");
  const errors = useTranslations("Errors");
  const https = useIsHttps();
  const alertRef = useRef<HTMLDivElement>(null);
  const [method, setMethod] = useState<PaymentMethod>("multicaixa_express");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<ApiErrorCode | null>(null);

  const form = useFields<Field>(
    { phone: "", cardNumber: "", expiry: "", cvc: "", cardName: "" },
    (values) => validate(method, values),
    "co"
  );

  // The pay button is at the bottom on phones; bring a failure notice into view.
  useEffect(() => {
    if (notice) alertRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [notice]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setFormError(null);

    const order: Field[] = isMobileMethod(method)
      ? ["phone"]
      : ["cardNumber", "expiry", "cvc", "cardName"];
    if (!form.attempt(order)) return;

    const v = form.values;
    const body = isMobileMethod(method)
      ? { sessionId, method, phone: v.phone }
      : {
          sessionId,
          method,
          card: { number: v.cardNumber, expiry: v.expiry, cvc: v.cvc, name: v.cardName },
        };

    setPending(true);
    let res: Response;
    try {
      res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      setPending(false);
      return setFormError("internal");
    }
    const payload = (await res.json().catch(() => ({}))) as {
      data?: PublicPayment;
      error?: { code?: ApiErrorCode; details?: Array<{ path: PropertyKey[]; message: string }> };
    };

    // Always release the button: a refused payment keeps this form on screen for a retry.
    setPending(false);
    if (res.ok && payload.data) return onCreated(payload.data);

    const code = payload.error?.code ?? "internal";
    if (code === "checkout_expired" || code === "checkout_paid") return onBlocked(code);
    if (code === "validation_failed" && payload.error?.details) {
      // Should be rare (the browser already validated), but the server is the authority.
      const mapped: FieldErrors<Field> = {};
      for (const [key, message] of Object.entries(firstError(payload.error.details))) {
        const field = key === "phone" ? "phone" : CARD_TO_FIELD[key as keyof typeof CARD_TO_FIELD];
        if (field) mapped[field] = message;
      }
      return form.setServerErrors(mapped);
    }
    setFormError(code);
  }

  const mobile = isMobileMethod(method);
  const brand = cardBrand(form.values.cardNumber.replace(/\D/g, ""));
  const select = (next: PaymentMethod) => {
    setMethod(next);
    setFormError(null);
  };

  return (
    // `noValidate`: our own translated messages replace the browser's native bubbles.
    <form onSubmit={onSubmit} noValidate>
      {(notice || formError) && (
        <div
          ref={alertRef}
          role="alert"
          className="mb-5 rounded-md border border-down px-4 py-3 text-sm leading-snug text-down"
        >
          {formError ? errors(formError) : notice}
        </div>
      )}

      <fieldset className="relative">
        <legend className="mb-3 text-sm font-medium text-ink">{t("method.legend")}</legend>
        {https && (
          <span className="absolute top-0 right-0 flex items-center gap-1.5 text-[13px] text-ink-muted">
            <LockIcon />
            {t("trust.encrypted")}
          </span>
        )}

        <div className="grid grid-cols-2 gap-3">
          {MOBILE_METHODS.map((m) => (
            <MethodTile key={m} method={m} selected={method === m} onSelect={select} />
          ))}
        </div>

        {mobile && (
          <div className="mt-5 space-y-3">
            <CheckoutField
              {...form.bind("phone", formatPhone)}
              label={t("fields.phone")}
              hint={t("fields.phoneHint")}
              error={form.errorFor("phone")}
              prefix="+244"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="923 456 789"
              numeric
            />
            <p className="text-[13px] leading-snug text-ink-muted">{t(`notes.${method}`)}</p>
            <p className="flex items-center gap-2 text-[13px] leading-snug text-ink-muted">
              <LockIcon />
              {t("trust.noPin")}
            </p>
          </div>
        )}

        <p className="mt-6 mb-3 text-[13px] text-ink-muted">{t("method.other")}</p>
        <MethodRow method="card" selected={!mobile} onSelect={select}>
          {!mobile && (
            <>
              <CheckoutField
                {...form.bind("cardNumber", formatCardNumber)}
                label={t("fields.cardNumber")}
                error={form.errorFor("cardNumber")}
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="1234 5678 9012 3456"
                suffix={BRAND_LABEL[brand]}
                numeric
              />
              <div className="grid grid-cols-2 gap-4">
                <CheckoutField
                  {...form.bind("expiry", formatExpiry)}
                  label={t("fields.expiry")}
                  error={form.errorFor("expiry")}
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  placeholder={t("fields.expiryPlaceholder")}
                  maxLength={5}
                  numeric
                />
                <CheckoutField
                  {...form.bind("cvc", formatCvc)}
                  label={t("fields.cvc")}
                  error={form.errorFor("cvc")}
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  placeholder="123"
                  maxLength={4}
                  numeric
                />
              </div>
              <CheckoutField
                {...form.bind("cardName")}
                label={t("fields.cardName")}
                error={form.errorFor("cardName")}
                autoComplete="cc-name"
                autoCapitalize="words"
              />
              <p className="flex items-center gap-2 text-[13px] leading-snug text-ink-muted">
                <LockIcon />
                {t("notes.card")}
              </p>
            </>
          )}
        </MethodRow>
      </fieldset>

      {/* Mobile: the pay button is pinned to the bottom (thumb reach) and always states the amount.
          It is the only filled, full-width control on the screen. */}
      <div
        className={
          inline
            ? "mt-8"
            : "fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:static lg:mt-8 lg:border-0 lg:bg-transparent lg:p-0"
        }
      >
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className={`flex h-14 w-full items-center justify-center gap-2.5 rounded-md bg-action text-[1.0625rem] font-semibold tracking-[0.005em] text-on-action tabular-nums transition-opacity hover:opacity-90 disabled:cursor-progress disabled:opacity-70 ${inline ? "" : "mx-auto max-w-md lg:max-w-none"}`}
        >
          <LockIcon size={18} />
          {pending ? t("paying") : t("pay", { amount: totalLabel })}
        </button>
      </div>
    </form>
  );
}
