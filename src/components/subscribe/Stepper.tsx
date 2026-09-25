"use client";

import { useTranslations } from "next-intl";

export type StepId = "plan" | "payment";
const STEPS: StepId[] = ["plan", "payment"];

/**
 * The steps as a list: done (tick), current, and still to come. A step you can already reach is a
 * button (so you can go back); the others are plain text. The current one is `aria-current="step"`.
 */
export function Stepper({
  current,
  reachable,
  onGo,
}: {
  current: StepId;
  /** The last step the visitor may jump to (payment needs a chosen plan). */
  reachable: StepId;
  onGo: (step: StepId) => void;
}) {
  const t = useTranslations("Subscribe.steps");
  const at = (id: StepId) => STEPS.indexOf(id);

  return (
    <nav aria-label={t("label")}>
      <ol className="flex items-center gap-2 sm:gap-3">
        {STEPS.map((id, i) => {
          const done = at(id) < at(current);
          const isCurrent = id === current;
          const canGo = at(id) <= at(reachable) && !isCurrent;
          const body = (
            <>
              <span
                aria-hidden
                className={`grid size-7 shrink-0 place-items-center rounded-full border text-[13px] font-semibold tabular-nums ${
                  isCurrent
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
                  i + 1
                )}
              </span>
              <span className={`text-sm ${isCurrent ? "font-semibold text-ink" : "text-ink-2"}`}>
                {t(id)}
                {done && <span className="sr-only"> — {t("completed")}</span>}
              </span>
            </>
          );
          return (
            <li
              key={id}
              aria-current={isCurrent ? "step" : undefined}
              className="flex items-center gap-2 sm:gap-3"
            >
              {canGo ? (
                <button
                  type="button"
                  onClick={() => onGo(id)}
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
