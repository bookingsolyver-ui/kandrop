"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import type { ApiErrorCode } from "@/server/http/errors";
import type { AuthResult, FieldError } from "./authApi";

interface Options<F extends string> {
  /** Field names in on-screen order (the first invalid one receives focus). */
  fields: readonly F[];
  /** Prefix for input ids, e.g. `login` → `login-email`. */
  id: string;
  initial: Record<F, string>;
  validate: (values: Record<F, string>) => Partial<Record<F, FieldError>>;
  submit: (values: Record<F, string>) => Promise<AuthResult>;
  onSuccess: () => void;
  /** After this form-level failure, empty `field` and put the cursor there (e.g. wrong password). */
  resetFieldOn?: { code: ApiErrorCode; field: F };
}

/**
 * Field-level validation UX shared by login and register:
 *  - an input's error appears after it is left (blur) or after a submit attempt — never while
 *    the user is still typing their first pass;
 *  - once shown, it updates live so the user sees it clear as they fix it;
 *  - failed submit focuses the first invalid input;
 *  - server verdicts (duplicate e-mail, bad credentials, rate limit) surface in the same UI.
 */
export function useAuthForm<F extends string>(opts: Options<F>) {
  const { fields, id, validate, submit, onSuccess, resetFieldOn } = opts;
  const [values, setValues] = useState<Record<F, string>>(opts.initial);
  const [touched, setTouched] = useState<Partial<Record<F, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverErrors, setServerErrors] = useState<Partial<Record<F, FieldError>>>({});
  const [formError, setFormError] = useState<ApiErrorCode | null>(null);

  const clientErrors = validate(values);
  const errorFor = (field: F): FieldError | undefined => {
    const shown = touched[field] || submitted ? clientErrors[field] : undefined;
    return shown ?? serverErrors[field];
  };
  const inputId = (field: F) => `${id}-${field}`;

  const focus = (field: F) => document.getElementById(inputId(field))?.focus();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setSubmitted(true);
    setFormError(null);

    const firstInvalid = fields.find((f) => clientErrors[f]);
    if (firstInvalid) return focus(firstInvalid);

    setPending(true);
    const result = await submit(values);
    if (result.ok) return onSuccess(); // keep `pending` on: the page is about to navigate away
    setPending(false);

    const fieldErrors = result.fieldErrors as Partial<Record<F, FieldError>>;
    setServerErrors(fieldErrors);
    setFormError(result.code ?? null);
    const failing = fields.find((f) => fieldErrors[f]);
    if (failing) return focus(failing);
    if (resetFieldOn && result.code === resetFieldOn.code) {
      setValues((v) => ({ ...v, [resetFieldOn.field]: "" }));
      // Back to a neutral state: the server already said what is wrong, so don't add
      // "required" on top of it for the field we just emptied.
      setTouched((t) => ({ ...t, [resetFieldOn.field]: false }));
      setSubmitted(false);
      focus(resetFieldOn.field);
    }
  }

  return {
    values,
    pending,
    formError,
    submitted,
    hasFieldErrors: fields.some((f) => errorFor(f)),
    onSubmit,
    setValue: (field: F, value: string) => setValues((v) => ({ ...v, [field]: value })),
    focus,
    /** Everything an input needs, wired for validation and accessibility. */
    field: (field: F) => ({
      id: inputId(field),
      name: field,
      value: values[field],
      error: errorFor(field),
      onBlur: () => setTouched((t) => ({ ...t, [field]: true })),
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setValues((v) => ({ ...v, [field]: value }));
        // A server verdict is about the old value; drop it as soon as the user edits.
        setServerErrors((s) => (s[field] ? { ...s, [field]: undefined } : s));
        if (formError) setFormError(null);
      },
    }),
  };
}
