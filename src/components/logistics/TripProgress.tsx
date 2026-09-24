"use client";

import { useTranslations } from "next-intl";
import {
  STAGE_STARTS,
  stagesFor,
  type DeliveryOutcome,
  type DeliveryStage,
} from "@/shared/logistics/schemas";

const FILL: Record<DeliveryStage, string> = {
  assigned: "bg-accent",
  picked_up: "bg-accent",
  in_transit: "bg-accent",
  delivered: "bg-up",
  returned: "bg-down",
};

/**
 * The trip as a bar. `compact` is one line for the table; the full version marks the four
 * stages under the bar and pulses the current one, so "where is it" reads at a glance.
 */
export function TripProgress({
  progress,
  stage,
  outcome,
  compact = false,
}: {
  progress: number;
  stage: DeliveryStage;
  outcome: DeliveryOutcome;
  compact?: boolean;
}) {
  const t = useTranslations("Logistics.stages");
  const percent = Math.round(progress * 100);
  const stages = stagesFor(outcome);
  const over = stage === "delivered" || stage === "returned";

  return (
    <div>
      <div
        role="progressbar"
        aria-label={t(stage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${t(stage)} — ${percent}%`}
        className={`overflow-hidden rounded-full bg-line ${compact ? "h-1.5" : "h-2"}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-linear motion-reduce:transition-none ${FILL[stage]}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {compact ? (
        <p className="mt-1.5 text-[12px] text-ink-muted">{t(stage)}</p>
      ) : (
        <ol className="relative mt-3 grid grid-cols-4 text-[12px]">
          {stages.map((s, i) => {
            const start = i === 3 ? 1 : STAGE_STARTS[s as keyof typeof STAGE_STARTS];
            const reached = progress >= start;
            const current = s === stage;
            return (
              <li
                key={s}
                aria-current={current ? "step" : undefined}
                className={`flex flex-col gap-1.5 ${i === 3 ? "items-end text-right" : i === 0 ? "items-start" : "items-center text-center"} ${
                  reached ? "text-ink" : "text-ink-muted"
                }`}
              >
                <span
                  aria-hidden
                  className={`size-2.5 rounded-full border ${
                    reached ? `${FILL[s]} border-transparent` : "border-field bg-page"
                  } ${current && !over ? "pulse ring-4 ring-accent/20" : ""}`}
                />
                <span className={current ? "font-medium" : ""}>{t(s)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
