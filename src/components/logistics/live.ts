import type { PublicDelivery } from "@/server/modules/logistics/schema";
import {
  progressOf,
  stageOf,
  statusOfStage,
  type DeliveryStage,
  type DeliveryStatus,
} from "@/shared/logistics/schemas";

/**
 * Where a delivery is *now*, worked out in the browser from its start and duration (the same
 * pure functions the server uses), so the bar moves every second without polling the API.
 */
export function liveState(
  d: Pick<PublicDelivery, "createdAt" | "durationMs" | "outcome">,
  now: number
): { progress: number; stage: DeliveryStage; status: DeliveryStatus } {
  const progress = progressOf(Date.parse(d.createdAt), d.durationMs, now);
  const stage = stageOf(progress, d.outcome);
  return { progress, stage, status: statusOfStage(stage) };
}

/** `0:42`, `12:05`, `1:02:30` — time left, for a countdown. */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}
