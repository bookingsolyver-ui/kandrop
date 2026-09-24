"use client";

import { useState } from "react";
import type { CheckoutValidationCode } from "@/shared/checkout/schemas";

export type FieldErrors<F extends string, E extends string = CheckoutValidationCode> = Partial<
  Record<F, E>
>;

/**
 * Same UX contract as the auth forms: an error shows after the field is left or after a
 * submit attempt, then updates live; a failed attempt focuses the first invalid field.
 */
export function useFields<F extends string, E extends string = CheckoutValidationCode>(
  initial: Record<F, string>,
  validate: (values: Record<F, string>) => FieldErrors<F, E>,
  idPrefix: string
) {
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState<Partial<Record<F, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors<F, E>>({});

  const errors = validate(values);
  const id = (field: F) => `${idPrefix}-${field}`;

  return {
    values,
    id,
    errorFor: (field: F) =>
      (touched[field] || submitted ? errors[field] : undefined) ?? serverErrors[field],
    /** Props shared by every text input: value, change (with formatting) and blur. */
    bind: (field: F, format: (raw: string) => string = (v) => v) => ({
      id: id(field),
      value: values[field],
      onChange: (e: { target: { value: string } }) => {
        setValues((v) => ({ ...v, [field]: format(e.target.value) }));
        setServerErrors((s) => (s[field] ? { ...s, [field]: undefined } : s));
      },
      onBlur: () => setTouched((t) => ({ ...t, [field]: true })),
    }),
    /** Marks the form as attempted; returns whether `order`'s fields are all valid. */
    attempt(order: F[]): boolean {
      setSubmitted(true);
      const first = order.find((f) => errors[f]);
      if (first) document.getElementById(id(first))?.focus();
      return !first;
    },
    setServerErrors: (e: FieldErrors<F, E>) => {
      setServerErrors(e);
      const first = (Object.keys(e) as F[]).find((f) => e[f]);
      if (first) document.getElementById(id(first))?.focus();
    },
  };
}
