"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { PaymentMethod } from "@/shared/checkout/schemas";
import { CardIcon, PhoneIcon } from "./icons";

interface OptionProps {
  method: PaymentMethod;
  selected: boolean;
  onSelect: (method: PaymentMethod) => void;
}

/** Native radio (shared `name`, so arrow keys move between every option), visually hidden. */
function Radio({ method, selected, onSelect }: OptionProps) {
  return (
    <input
      type="radio"
      name="method"
      value={method}
      checked={selected}
      onChange={() => onSelect(method)}
      className="peer sr-only"
    />
  );
}

/** Selection is a filled tick, not just a colour change. */
function Mark({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid size-5 shrink-0 place-items-center rounded-full border transition-colors motion-reduce:transition-none ${
        selected ? "border-select bg-select text-surface" : "border-field"
      }`}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={selected ? "opacity-100" : "opacity-0"}
      >
        <path d="M2.75 6.25 5 8.5l4.25-5" />
      </svg>
    </span>
  );
}

const focusRing =
  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-series-1";

/**
 * The two Angolan mobile-money methods, side by side: the way most buyers here pay, so they
 * get the most prominent, equal-weight choice. Names carry the identity (no invented logos).
 */
export function MethodTile(props: OptionProps) {
  const t = useTranslations("Checkout.method");
  const { method, selected } = props;
  return (
    <label className="flex cursor-pointer">
      <Radio {...props} />
      <span
        className={`flex min-h-28 w-full flex-col justify-between gap-3 rounded-lg border bg-surface p-4 transition-colors motion-reduce:transition-none ${focusRing} ${
          selected ? "border-select ring-1 ring-select" : "border-line hover:border-field"
        }`}
      >
        <span className="flex items-start justify-between">
          <span className="text-ink-2">
            <PhoneIcon />
          </span>
          <Mark selected={selected} />
        </span>
        <span>
          <span className="block leading-snug font-semibold text-balance">
            {t(`${method}.name`)}
          </span>
          <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">
            {t(`${method}.hint`)}
          </span>
        </span>
      </span>
    </label>
  );
}

/** Card is the secondary path: a quieter full-width row, with its fields attached below. */
export function MethodRow({ children, ...props }: OptionProps & { children?: ReactNode }) {
  const t = useTranslations("Checkout.method");
  const { method, selected } = props;
  return (
    <div
      className={`rounded-lg border bg-surface transition-colors motion-reduce:transition-none ${
        selected ? "border-select ring-1 ring-select" : "border-line"
      }`}
    >
      <label className="block cursor-pointer">
        <Radio {...props} />
        <span className={`flex min-h-16 items-center gap-3 rounded-lg px-4 py-3 ${focusRing}`}>
          <span className="text-ink-2">
            <CardIcon />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{t(`${method}.name`)}</span>
            <span className="block text-[13px] text-ink-muted">{t(`${method}.hint`)}</span>
          </span>
          <Mark selected={selected} />
        </span>
      </label>
      {children && <div className="space-y-4 border-t border-line px-4 pt-4 pb-5">{children}</div>}
    </div>
  );
}
