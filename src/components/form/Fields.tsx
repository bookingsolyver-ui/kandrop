"use client";

import type { ChangeEventHandler, ReactNode } from "react";
import { AlertIcon } from "@/components/data/icons";

interface ShellProps {
  id: string;
  label: string;
  /** Already translated. Shown instead of `hint` while present. */
  error?: string;
  hint?: string;
  children: ReactNode;
}

/** Label above, control, then one line of help or error linked to the control by `${id}-note`. */
function FieldShell({ id, label, error, hint, children }: ShellProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p
          id={`${id}-note`}
          className="mt-2 flex items-start gap-2 text-[13px] leading-snug text-down"
        >
          <span className="mt-px">
            <AlertIcon />
          </span>
          <span>{error}</span>
        </p>
      ) : (
        hint && (
          <p id={`${id}-note`} className="mt-2 text-[13px] leading-snug text-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

const control = (error?: string) =>
  `w-full rounded-md border bg-surface text-base text-ink transition-colors placeholder:text-ink-muted ${
    error ? "border-down" : "border-field"
  }`;

interface BaseProps extends Omit<ShellProps, "children"> {
  value: string;
  onBlur: () => void;
}

export function TextField({
  id,
  label,
  error,
  hint,
  value,
  onBlur,
  onChange,
  suffix,
  prefix,
  numeric,
  ...input
}: BaseProps & {
  onChange: ChangeEventHandler<HTMLInputElement>;
  suffix?: string;
  /** Fixed text inside the field's left edge (e.g. `+244`). */
  prefix?: string;
  numeric?: boolean;
  inputMode?: "numeric" | "text";
  type?: "text" | "password" | "datetime-local";
  /** For values that legitimately differ between server and browser (e.g. local time zones). */
  suppressHydrationWarning?: boolean;
  autoComplete?: string;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <div className="relative">
        <input
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-note` : undefined}
          spellCheck={false}
          {...input}
          className={`h-12 ${prefix ? "pl-20" : "pl-3.5"} pr-3.5 ${suffix ? "pr-12" : ""} ${numeric ? "tabular-nums" : ""} ${control(error)}`}
        />
        {prefix && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 grid w-16 place-items-center border-r border-line text-base text-ink-2"
          >
            {prefix}
          </span>
        )}
        {suffix && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-ink-2"
          >
            {suffix}
          </span>
        )}
      </div>
    </FieldShell>
  );
}

export function TextArea({
  id,
  label,
  error,
  hint,
  value,
  onBlur,
  onChange,
  maxLength,
}: BaseProps & { onChange: ChangeEventHandler<HTMLTextAreaElement>; maxLength?: number }) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <textarea
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        rows={4}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-note` : undefined}
        className={`min-h-28 resize-y px-3.5 py-3 leading-relaxed ${control(error)}`}
      />
    </FieldShell>
  );
}

export function SelectField({
  id,
  label,
  error,
  value,
  onBlur,
  onChange,
  children,
}: Omit<BaseProps, "hint"> & {
  onChange: ChangeEventHandler<HTMLSelectElement>;
  children: ReactNode;
}) {
  return (
    <FieldShell id={id} label={label} error={error}>
      <select
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-note` : undefined}
        className={`h-12 px-3 ${control(error)}`}
      >
        {children}
      </select>
    </FieldShell>
  );
}
