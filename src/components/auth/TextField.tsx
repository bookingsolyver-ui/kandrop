"use client";

import { useState, type ChangeEventHandler, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { FieldError } from "./authApi";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/shared/auth/schemas";

export interface FieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  error?: FieldError;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onBlur: () => void;
  autoComplete?: string;
  type?: "text" | "email";
  inputMode?: "email" | "text";
  /** Extra description (e.g. the password rules) linked to the input for screen readers. */
  describedBy?: string;
  children?: ReactNode;
}

const INPUT =
  "h-11 w-full rounded-md border bg-surface px-3.5 text-base text-ink outline-offset-2 transition-colors";

/** Translates a field error: validation codes live in `Auth.validation`, server ones in `Errors`. */
function useErrorText() {
  const tv = useTranslations("Auth.validation");
  const te = useTranslations("Errors");
  return (code: FieldError) =>
    code === "email_taken" ? te("email_taken") : tv(code, { min: PASSWORD_MIN, max: PASSWORD_MAX });
}

function ErrorMessage({ id, error }: { id: string; error: FieldError }) {
  const text = useErrorText();
  return (
    <p id={id} className="mt-2 flex items-start gap-2 text-[13px] leading-snug text-down">
      <svg
        aria-hidden
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="mt-px shrink-0"
      >
        <circle cx="7" cy="7" r="5.75" />
        <path d="M7 4v3.4M7 9.6v.01" />
      </svg>
      <span>{text(error)}</span>
    </p>
  );
}

export function TextField({ id, label, error, describedBy, children, ...input }: FieldProps) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        {...input}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [error ? errorId : null, describedBy].filter(Boolean).join(" ") || undefined
        }
        autoCapitalize="none"
        spellCheck={false}
        className={`${INPUT} ${error ? "border-down" : "border-field"}`}
      />
      {error && <ErrorMessage id={errorId} error={error} />}
      {children}
    </div>
  );
}

export function PasswordField({
  id,
  label,
  error,
  describedBy,
  children,
  autoComplete,
  ...input
}: FieldProps) {
  const t = useTranslations("Auth.password");
  const [visible, setVisible] = useState(false);
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          {...input}
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [error ? errorId : null, describedBy].filter(Boolean).join(" ") || undefined
          }
          autoCapitalize="none"
          spellCheck={false}
          className={`${INPUT} pr-12 ${error ? "border-down" : "border-field"}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("hide") : t("show")}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-ink-muted hover:text-ink"
        >
          <svg
            aria-hidden
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1.5 9S4 3.75 9 3.75 16.5 9 16.5 9 14 14.25 9 14.25 1.5 9 1.5 9Z" />
            <circle cx="9" cy="9" r="2.25" />
            {visible && <path d="M2.5 15.5l13-13" />}
          </svg>
        </button>
      </div>
      {error && <ErrorMessage id={errorId} error={error} />}
      {children}
    </div>
  );
}
