"use client";

import { useTranslations } from "next-intl";
import { useState, type ChangeEventHandler, type ReactNode } from "react";
import { AlertCircleIcon } from "@/components/kai/icons";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/shared/auth/schemas";
import type { FieldError } from "./authApi";

/** What `useAuthForm().field(name)` returns: everything an input needs. */
export interface FieldBinding {
  id: string;
  name: string;
  value: string;
  error?: FieldError;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onBlur: () => void;
}

const INPUT =
  "flex h-12 w-full rounded-xl border bg-input px-3 py-2 pl-10 text-sm text-foreground shadow-xs outline-none transition-all placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20";
const LABEL = "text-xs font-semibold tracking-wide text-foreground/80 uppercase";
const ICON =
  "absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary";

type IconProps = { className?: string };
const Svg = ({ className, children }: IconProps & { children: ReactNode }) => (
  <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {children}
  </svg>
);
export const MailIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </Svg>
);
export const LockIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);
export const UserIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Svg>
);
export const StoreIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5" />
    <path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244" />
    <path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05" />
  </Svg>
);
function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="m3 3 18 18" />}
    </svg>
  );
}

/** Translates a field error: validation codes live in `Auth.validation`, server ones in `Errors`. */
function ErrorText({ id, error }: { id: string; error: FieldError }) {
  const tv = useTranslations("Auth.validation");
  const te = useTranslations("Errors");
  const text =
    error === "email_taken" ? te("email_taken") : tv(error, { min: PASSWORD_MIN, max: PASSWORD_MAX });
  return (
    <p id={id} className="mt-1.5 flex items-start gap-2 text-[13px] leading-snug text-down">
      <AlertCircleIcon size={14} className="mt-px shrink-0" />
      <span>{text}</span>
    </p>
  );
}

/** A labelled input with a leading icon, for the sign-in and sign-up pages. */
export function AuthField({
  field,
  label,
  icon,
  type = "text",
  inputMode,
  autoComplete,
  placeholder,
  describedBy,
  children,
}: {
  field: FieldBinding;
  label: string;
  icon: ReactNode;
  type?: "text" | "email" | "password";
  inputMode?: "email" | "text";
  autoComplete?: string;
  placeholder?: string;
  /** Another element that describes the input (e.g. the password rules). */
  describedBy?: string;
  /** Rendered under the error (e.g. the password rules list). */
  children?: ReactNode;
}) {
  const t = useTranslations("Auth.password");
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const errorId = `${field.id}-error`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={field.id} className={LABEL}>
        {label}
      </label>
      <div className="group relative">
        <span className={ICON}>{icon}</span>
        <input
          id={field.id}
          name={field.name}
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          type={isPassword && visible ? "text" : type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          placeholder={placeholder}
          aria-invalid={field.error ? true : undefined}
          aria-describedby={[field.error ? errorId : null, describedBy].filter(Boolean).join(" ") || undefined}
          className={`${INPUT} ${isPassword ? "pr-11" : ""} ${field.error ? "border-down" : "border-border"}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? t("hide") : t("show")}
            aria-pressed={visible}
            className="absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <EyeIcon off={visible} />
          </button>
        )}
      </div>
      {field.error && <ErrorText id={errorId} error={field.error} />}
      {children}
    </div>
  );
}
