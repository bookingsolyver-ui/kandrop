"use client";

import { useTranslations } from "next-intl";

const STEPS = ["plan", "details", "payment"] as const;

/**
 * The three steps as a list: done (tick), current, and still to come. A step you can already
 * reach is a button (so you can go back); the others are plain text. The current one is
 * `aria-current="step"`.
 */
export function Stepper({
  step,
  reachable,
  onGo,
}: {
  step: 1 | 2 | 3;
  /** The highest step the visitor may jump to (3 only once the details are valid). */
  reachable: 1 | 2 | 3;
  onGo: (step: 1 | 2 | 3) => void;
}) {
  const t = useTranslations("Subscribe.steps");

  return (
    <nav aria-label={t("label")}>
      <ol className="flex items-center gap-2 sm:gap-3">
        {STEPS.map((id, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          const done = n < step;
          const current = n === step;
          const canGo = n <= reachable && !current;
          const body = (
            <>
              <span
                aria-hidden
                className={`grid size-7 shrink-0 place-items-center rounded-full border text-[13px] font-semibold tabular-nums ${
                  current
                    ? "border-accent bg-accent text-on-action"
                    : done
                      ? "border-accent text-accent"
                      : "border-field text-ink-muted"
                }`}
              >
                {done ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m3 7.5 2.5 2.5L11 4" />
                  </svg>
                ) : (
                  n
                )}
              </span>
              <span className={`text-sm ${current ? "font-semibold text-ink" : "text-ink-2"}`}>
                {t(id)}
                {done && <span className="sr-only"> — {t("completed")}</span>}
              </span>
            </>
          );
          return (
            <li
              key={id}
              aria-current={current ? "step" : undefined}
              className="flex items-center gap-2 sm:gap-3"
            >
              {canGo ? (
                <button
                  type="button"
                  onClick={() => onGo(n)}
                  className="flex min-h-11 items-center gap-2 rounded-md hover:text-ink"
                >
                  {body}
                </button>
              ) : (
                <span className="flex min-h-11 items-center gap-2">{body}</span>
              )}
              {i < STEPS.length - 1 && <span aria-hidden className="h-px w-4 bg-line sm:w-10" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
