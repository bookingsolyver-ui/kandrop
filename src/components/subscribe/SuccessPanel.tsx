"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Link } from "@/i18n/navigation";
import type { PaidWith } from "./PaymentStep";

/** The end of the prototype: says what "paid" means here (nothing was charged), and how to start over. */
export function SuccessPanel({
  plan,
  method,
  amount,
  onRestart,
}: {
  plan: string;
  method: PaidWith;
  amount: string;
  onRestart: () => void;
}) {
  const t = useTranslations("Subscribe.success");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  return (
    <section className="mx-auto max-w-xl rounded-lg border border-line bg-surface p-8 text-center sm:p-10">
      <span
        aria-hidden
        className="mx-auto mb-5 grid size-14 place-items-center rounded-full border border-accent text-accent"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 12.5l4 4 8-9" />
        </svg>
      </span>
      <div role="status">
        <h1
          ref={heading}
          tabIndex={-1}
          className="font-serif text-[1.75rem] leading-tight outline-none"
        >
          {method === "bank" ? t("bankTitle") : t("title", { plan })}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-ink-2">{t(method, { amount })}</p>
      </div>
      <p className="mx-auto mt-6 max-w-sm rounded-md border border-series-2 px-4 py-3 text-[13px] leading-snug">
        {t("prototype")}
      </p>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <Link
          href="/register"
          className="flex h-12 items-center justify-center rounded-md bg-action px-6 text-[0.9375rem] font-semibold text-on-action hover:opacity-90"
        >
          {t("register")}
        </Link>
        <button
          type="button"
          onClick={onRestart}
          className="h-12 rounded-md border border-field px-6 text-[0.9375rem] font-medium hover:bg-ink/5"
        >
          {t("restart")}
        </button>
      </div>
    </section>
  );
}
