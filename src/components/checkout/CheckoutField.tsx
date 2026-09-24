"use client";

import { useTranslations } from "next-intl";
import type { ChangeEventHandler, ReactNode } from "react";
import type { CheckoutValidationCode } from "@/shared/checkout/schemas";

interface CheckoutFieldProps {
  id: string;
  label: string;
  value: string;
  error?: CheckoutValidationCode;
  hint?: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onBlur: () => void;
  autoComplete: string;
  autoCapitalize?: "none" | "words";
  inputMode?: "numeric" | "tel" | "text";
  placeholder?: string;
  maxLength?: number;
  /** Fixed text inside the field's left edge (e.g. `+244`). */
  prefix?: string;
  /** Small element inside the right edge (e.g. the detected card brand). */
  suffix?: ReactNode;
  /** Numbers read better with tabular figures. */
  numeric?: boolean;
}

/**
 * Mobile-first input: 48px tall and 16px text (anything smaller makes iOS zoom the page on
 * focus). Errors say what to fix and are linked to the input for screen readers.
 */
export function CheckoutField({
  id,
  label,
  value,
  error,
  hint,
  onChange,
  onBlur,
  autoComplete,
  autoCapitalize = "none",
  inputMode,
  placeholder,
  maxLength,
  prefix,
  suffix,
  numeric,
}: CheckoutFieldProps) {
  const t = useTranslations("Checkout.validation");
  const noteId = `${id}-note`;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 grid w-16 place-items-center border-r border-line text-base text-ink-2"
          >
            {prefix}
          </span>
        )}
        <input
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete={autoComplete}
          inputMode={inputMode}
          placeholder={placeholder}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? noteId : undefined}
          className={`h-12 w-full rounded-md border bg-surface text-base text-ink transition-colors placeholder:text-ink-muted ${
            prefix ? "pl-20" : "pl-3.5"
          } ${suffix ? "pr-20" : "pr-3.5"} ${numeric ? "tabular-nums" : ""} ${
            error ? "border-down" : "border-field"
          }`}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-[13px] font-medium text-ink-2">
            {suffix}
          </span>
        )}
      </div>

      {error ? (
        <p id={noteId} className="mt-2 flex items-start gap-2 text-[13px] leading-snug text-down">
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
          <span>{t(error)}</span>
        </p>
      ) : (
        hint && (
          <p id={noteId} className="mt-2 text-[13px] leading-snug text-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
