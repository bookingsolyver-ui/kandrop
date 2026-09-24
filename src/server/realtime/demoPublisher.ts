import { getEnv } from "../config/env";
import type { DashboardSummary } from "../modules/dashboard/schema";
import { eventBus } from "./eventBus";

const g = globalThis as unknown as { __kandropDemo?: ReturnType<typeof setInterval> };

/**
 * Development-only producer so the live dashboard visibly moves before real payment
 * events exist. Real producers (payment webhooks, settlement jobs) call
 * `eventBus.publish` directly — same path, same transport.
 */
export function ensureDemoPublisher(storeId: string) {
  const env = getEnv();
  if (!env.KANDROP_DEMO_EVENTS || env.NODE_ENV === "production" || g.__kandropDemo) return;

  let volume = 0;
  let count = 0;
  g.__kandropDemo = setInterval(() => {
    count += 1;
    volume += Math.round((5_000 + Math.random() * 95_000) * 100);
    const summary: DashboardSummary = {
      volumeToday: { amount: volume, currency: "AOA" },
      transactionsToday: count,
      successRate: 0.94 + Math.random() * 0.05,
      pendingSettlement: { amount: Math.round(volume * 0.3), currency: "AOA" },
      updatedAt: new Date().toISOString(),
    };
    eventBus.publish(storeId, "dashboard.summary", summary);
  }, 3000);
  g.__kandropDemo.unref?.();
}
