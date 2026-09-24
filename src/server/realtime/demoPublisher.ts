import { getEnv } from "../config/env";
import { withPayouts } from "../modules/dashboard/service";
import { tick } from "../modules/dashboard/simulator";
import { eventBus } from "./eventBus";

const TICK_MS = 2500;

/** Identifies this evaluation of the module, so a hot-reloaded copy can replace a stale timer. */
const OWNER = {};

const g = globalThis as unknown as {
  __kandropDemo?: { owner: object; timer: ReturnType<typeof setInterval> };
  __kandropDemoStores?: Set<string>;
};

/**
 * Development-only producer so the live dashboard visibly moves before real payment
 * events exist. Every store that opens the stream receives the (shared) simulated feed.
 * Real producers (order webhooks, settlement jobs) call `eventBus.publish` directly —
 * same path, same transport, same event contract.
 */
export function ensureDemoPublisher(storeId: string) {
  const env = getEnv();
  if (!env.KANDROP_DEMO_EVENTS || env.NODE_ENV === "production") return;

  const stores = (g.__kandropDemoStores ??= new Set<string>());
  stores.add(storeId);
  if (g.__kandropDemo?.owner === OWNER) return;

  // A timer left by a previous hot-reload would keep publishing with stale code.
  if (g.__kandropDemo) clearInterval(g.__kandropDemo.timer);

  const timer = setInterval(() => {
    const summary = tick();
    for (const id of stores) eventBus.publish(id, "dashboard.summary", withPayouts(summary, id));
  }, TICK_MS);
  timer.unref?.();
  g.__kandropDemo = { owner: OWNER, timer };
}
