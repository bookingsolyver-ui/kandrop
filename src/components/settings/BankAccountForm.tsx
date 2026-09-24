"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";
import { useFields, type FieldErrors } from "@/components/checkout/useFields";
import { TextField } from "@/components/form/Fields";
import { useOrderFormat } from "@/components/orders/useOrderFormat";
import type { ApiErrorCode } from "@/server/http/errors";
import type { PublicBankAccount } from "@/server/modules/bank/schema";
import {
  IBAN_LENGTH,
  bankAccountSchema,
  firstBankError,
  formatIbanInput,
  normalizeIban,
  type BankValidationCode,
} from "@/shared/bank/schemas";
import { getBankAccount, saveBankAccount } from "./bankApi";

type Field = "holderName" | "iban" | "password";
const ORDER: Field[] = ["holderName", "iban", "password"];

function validate(values: Record<Field, string>): FieldErrors<Field, BankValidationCode> {
  const parsed = bankAccountSchema.safeParse(values);
  return parsed.success
    ? {}
    : (firstBankError(parsed.error.issues) as FieldErrors<Field, BankValidationCode>);
}

/** The entry form. It is unmounted after a save, so nothing typed (least of all the password) lingers. */
function BankForm({
  onSaved,
  onCancel,
}: {
  onSaved: (account: PublicBankAccount) => void;
  onCancel?: () => void;
}) {
  const t = useTranslations("Settings.bank");
  const errors = useTranslations("Errors");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<ApiErrorCode | null>(null);
  const form = useFields<Field, BankValidationCode>(
    { holderName: "", iban: "", password: "" },
    validate,
    "bk"
  );

  const message = (field: Field) => {
    const code = form.errorFor(field);
    return code ? t(`validation.${code}`) : undefined;
  };
  const digits = normalizeIban(form.values.iban).length;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setFormError(null);
    if (!form.attempt(ORDER)) return;

    setPending(true);
    const result = await saveBankAccount(form.values);
    setPending(false);

    if (result.ok) return onSaved(result.data);
    if (result.code === "invalid_credentials") {
      return form.setServerErrors({ password: "password_incorrect" });
    }
    if (result.code === "validation_failed" && Object.keys(result.fieldErrors).length > 0) {
      return form.setServerErrors(result.fieldErrors as FieldErrors<Field, BankValidationCode>);
    }
    setFormError(result.code);
  }

  return (
    // `noValidate`: our own translated messages replace the browser's native bubbles.
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && (
        <div role="alert" className="rounded-md border border-down px-4 py-3 text-sm text-down">
          {errors(formError)}
        </div>
      )}

      <TextField
        {...form.bind("holderName")}
        label={t("fields.holder")}
        hint={t("fields.holderHint")}
        error={message("holderName")}
        autoComplete="name"
        maxLength={70}
      />
      <TextField
        {...form.bind("iban", formatIbanInput)}
        label={t("fields.iban")}
        hint={t("fields.ibanHint")}
        error={message("iban")}
        suffix={t("fields.ibanCount", { count: digits })}
        inputMode="numeric"
        autoComplete="off"
        maxLength={IBAN_LENGTH + 6}
        placeholder="AO06 0000 0000 0000 0000 0000 0"
        numeric
      />
      <TextField
        {...form.bind("password")}
        type="password"
        label={t("fields.password")}
        hint={t("fields.passwordHint")}
        error={message("password")}
        autoComplete="current-password"
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="h-12 rounded-md bg-action px-7 text-[0.9375rem] font-semibold text-on-action hover:opacity-90 disabled:cursor-progress disabled:opacity-70"
        >
          {pending ? t("saving") : t("save")}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded px-1 text-sm text-ink-2 underline underline-offset-4 hover:text-ink"
          >
            {t("cancel")}
          </button>
        )}
      </div>
    </form>
  );
}

export function BankAccountForm({
  initial,
  canEdit,
}: {
  initial: PublicBankAccount | null;
  canEdit: boolean;
}) {
  const t = useTranslations("Settings.bank");
  const fmt = useOrderFormat();
  const [account, setAccount] = useState(initial);
  const [editing, setEditing] = useState(initial === null);
  const [justSaved, setJustSaved] = useState(false);

  // The menu prefetches this page and Next keeps that copy for minutes, so `initial` may be older
  // than the server's truth (e.g. after saving, leaving and coming back). Ask again on every mount.
  useEffect(() => {
    let cancelled = false;
    getBankAccount().then((result) => {
      if (cancelled || !result.ok) return;
      setAccount(result.data);
      if (result.data === null) setEditing(true);
      else if (initial === null) setEditing(false); // the cached page believed there was none
    });
    return () => {
      cancelled = true;
    };
  }, [initial]);

  if (!canEdit && !account) {
    return <p className="text-sm text-ink-2">{t("ownerOnly")}</p>;
  }

  if (editing && canEdit) {
    return (
      <BankForm
        onCancel={account ? () => setEditing(false) : undefined}
        onSaved={(saved) => {
          setAccount(saved);
          setEditing(false);
          setJustSaved(true);
        }}
      />
    );
  }

  return (
    <div>
      <dl className="divide-y divide-line text-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pb-3">
          <dt className="text-ink-muted">{t("current.holder")}</dt>
          <dd className="font-medium">{account!.holderName}</dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
          <dt className="text-ink-muted">{t("current.iban")}</dt>
          <dd className="font-medium tabular-nums">{account!.ibanMasked}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[13px] text-ink-muted">
        {t("current.updated", { date: fmt.long(account!.updatedAt) })}
      </p>
      <p role="status" className="mt-3 text-sm text-up empty:hidden">
        {justSaved ? t("saved") : ""}
      </p>
      {canEdit ? (
        <button
          type="button"
          onClick={() => {
            setJustSaved(false);
            setEditing(true);
          }}
          className="mt-4 h-11 rounded-md border border-field px-5 text-sm font-medium hover:bg-page"
        >
          {t("current.change")}
        </button>
      ) : (
        <p className="mt-4 text-sm text-ink-2">{t("ownerOnly")}</p>
      )}
    </div>
  );
}
