"use client";

import { useTranslations } from "next-intl";
import type { FormEvent } from "react";
import { SelectField, TextField } from "@/components/form/Fields";
import { formatPhone } from "@/components/checkout/formatInput";
import type { useFields } from "@/components/checkout/useFields";
import { PROVINCES, type DetailsCode, type DetailsField } from "@/shared/subscribe/schemas";

export type DetailsForm = ReturnType<typeof useFields<DetailsField, DetailsCode>>;

export const DETAILS_ORDER: DetailsField[] = [
  "fullName",
  "email",
  "whatsapp",
  "password",
  "province",
];

/**
 * Step 2, left column. `noValidate`: our own translated messages replace the browser's bubbles.
 * Continuing is refused until every field is valid: the first invalid one is focused and every
 * error is shown at once.
 */
export function DetailsStep({
  form,
  onContinue,
  onBack,
}: {
  form: DetailsForm;
  onContinue: () => void;
  onBack: () => void;
}) {
  const t = useTranslations("Subscribe");
  const v = useTranslations("Subscribe.validation");
  const message = (field: DetailsField) => {
    const code = form.errorFor(field);
    return code ? v(code) : undefined;
  };

  function submit(event: FormEvent) {
    event.preventDefault();
    if (form.attempt(DETAILS_ORDER)) onContinue();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <TextField
        {...form.bind("fullName")}
        label={t("details.fullName")}
        error={message("fullName")}
        autoComplete="name"
        maxLength={80}
      />
      <TextField
        {...form.bind("email", (raw) => raw.trim())}
        label={t("details.email")}
        error={message("email")}
        autoComplete="email"
        inputMode="text"
      />
      <TextField
        {...form.bind("whatsapp", formatPhone)}
        label={t("details.whatsapp")}
        hint={t("details.whatsappHint")}
        error={message("whatsapp")}
        prefix="+244"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="923 456 789"
        numeric
      />
      <TextField
        {...form.bind("password")}
        type="password"
        label={t("details.password")}
        hint={t("details.passwordHint")}
        error={message("password")}
        autoComplete="new-password"
        maxLength={128}
      />
      <SelectField
        {...form.bind("province")}
        label={t("details.province")}
        error={message("province")}
      >
        <option value="" disabled>
          {t("details.provincePlaceholder")}
        </option>
        {PROVINCES.map((province) => (
          <option key={province} value={province}>
            {province}
          </option>
        ))}
      </SelectField>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 rounded px-1 text-sm text-ink-2 underline underline-offset-4 hover:text-ink"
        >
          {t("details.back")}
        </button>
        <button
          type="submit"
          className="h-14 rounded-md bg-action px-8 text-[1.0625rem] font-semibold text-on-action transition-opacity hover:opacity-90"
        >
          {t("details.continue")}
        </button>
      </div>
    </form>
  );
}
