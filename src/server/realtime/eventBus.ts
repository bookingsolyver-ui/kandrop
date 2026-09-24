import { EventEmitter } from "node:events";

/** Event contract shared by every real-time producer and the SSE transport. */
export interface RealtimeEvents {
  "dashboard.summary": import("../modules/dashboard/schema").DashboardSummary;
}
export type RealtimeEventName = keyof RealtimeEvents;

export interface RealtimeMessage<K extends RealtimeEventName = RealtimeEventName> {
  event: K;
  data: RealtimeEvents[K];
}

/**
 * In-process pub/sub, scoped per store (tenant). This is the seam for scaling:
 * to run multiple instances, replace the EventEmitter with Redis/NATS pub/sub
 * behind the same `publish` / `subscribe` signatures — no route code changes.
 */
class EventBus {
  private emitter = new EventEmitter().setMaxListeners(0);

  publish<K extends RealtimeEventName>(storeId: string, event: K, data: RealtimeEvents[K]) {
    this.emitter.emit(storeId, { event, data } satisfies RealtimeMessage<K>);
  }

  subscribe(storeId: string, listener: (msg: RealtimeMessage) => void): () => void {
    this.emitter.on(storeId, listener);
    return () => this.emitter.off(storeId, listener);
  }
}

// Survive Next.js dev hot-reloads: keep one bus per process.
const g = globalThis as unknown as { __kandropBus?: EventBus };
export const eventBus = (g.__kandropBus ??= new EventBus());
