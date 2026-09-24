"use client";

import { useTranslations } from "next-intl";
import type { FormEventHandler, ReactNode } from "react";
import type { ApiErrorCode } from "@/server/http/errors";

/** `<form>` with the shared submit button and the form-level (not field-level) error banner. */
export function FormShell({
  onSubmit,
  formError,
  showFixHint,
  pending,
  submitLabel,
  pendingLabel,
  children,
}: {
  onSubmit: FormEventHandler;
  formError: ApiErrorCode | null;
  /** True after a submit attempt while some fields are still invalid. */
  showFixHint: boolean;
  pending: boolean;
  submitLabel: string;
  pendingLabel: string;
  children: ReactNode;
}) {
  const errors = useTranslations("Errors");
  const t = useTranslations("Auth");

  return (
    // `noValidate`: the browser's native bubbles are replaced by our own translated messages.
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {(formError || showFixHint) && (
        <div
          role="alert"
          className="rounded-md border border-down px-3.5 py-3 text-[13px] leading-snug text-down"
        >
          {formError ? errors(formError) : t("fixErrors")}
        </div>
      )}

      {children}

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="h-11 w-full rounded-md bg-brand text-[15px] font-medium text-on-brand transition-opacity hover:opacity-90 disabled:cursor-progress disabled:opacity-70"
      >
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
