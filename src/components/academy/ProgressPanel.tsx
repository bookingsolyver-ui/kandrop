"use client";

import { useTranslations } from "next-intl";
import { useFormatters } from "@/components/dashboard/useFormatters";
import type { AcademyOverview } from "@/server/modules/academy/schema";

/**
 * "Your progress": the share of the course done, as a big number and a neon bar, and — the
 * retention part — one button that takes you straight to the next lesson. Everything is
 * computed from the lessons the person really completed.
 */
export function ProgressPanel({
  data,
  currentNumber,
  onContinue,
}: {
  data: AcademyOverview;
  /** 1-based position of the lesson to take next. */
  currentNumber: number;
  onContinue: () => void;
}) {
  const t = useTranslations("Academy.progress");
  const f = useFormatters();
  const finished = data.completed === data.total;

  return (
    <section
      aria-labelledby="progress-title"
      className="grid gap-6 rounded-lg border border-line bg-surface p-6 sm:p-8 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-10"
    >
      <div>
        <h2
          id="progress-title"
          className="text-[11px] font-medium tracking-[0.18em] text-accent uppercase"
        >
          {t("label")}
        </h2>
        <p className="mt-2 font-serif text-[clamp(3.25rem,8vw,4.75rem)] leading-none font-normal tracking-[-0.02em] tabular-nums">
          {f.integer(data.percent)}
          <span className="text-[0.5em] text-ink-2">%</span>
        </p>
      </div>

      <div className="min-w-0">
        <div
          role="progressbar"
          aria-label={t("bar")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={data.percent}
          className="h-2.5 overflow-hidden rounded-full bg-line"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out motion-reduce:transition-none"
            style={{ width: `${data.percent}%` }}
          />
        </div>
        <p className="mt-3 text-[15px] text-ink tabular-nums">
          {t("summary", { done: data.completed, total: data.total })}
          {!finished && (
            <span className="text-ink-muted">
              {" · "}
              {t("left", { minutes: data.minutesLeft })}
            </span>
          )}
        </p>
        {finished && <p className="mt-1 text-sm text-ink-2">{t("complete")}</p>}
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="h-12 rounded-md bg-action px-6 text-[0.9375rem] font-semibold text-on-action transition-opacity hover:opacity-90"
      >
        {finished ? t("review") : t("continue", { n: currentNumber })}
      </button>
    </section>
  );
}
