"use client";

import { createContext, useCallback, useEffect, useState, type ReactNode } from "react";
import type { DashboardSummary } from "@/server/modules/dashboard/schema";

export type LiveStatus = "connecting" | "live" | "reconnecting";

export interface LiveState {
  summary: DashboardSummary | null;
  status: LiveStatus;
  /** `true` once a pushed update has arrived: values changing now are live changes. */
  isLive: boolean;
  /** Fetches a fresh snapshot now (e.g. after loading demo data). */
  refresh: () => Promise<void>;
}

/** How often the snapshot is re-read while the tab is visible: the push channel (SSE) is not
 * available on every host (serverless), so this keeps the numbers and "updated at" moving. */
const POLL_MS = 12_000;

export const LiveContext = createContext<LiveState | null>(null);

/**
 * The one real-time connection of the merchant area, opened by the app shell so every page
 * (and the header's status indicator) shares it instead of each opening its own.
 *
 * 1. Fetches a snapshot for immediate paint.
 * 2. Subscribes to `/api/dashboard/stream` (Server-Sent Events) for pushed updates.
 *
 * Components read it through `useDashboardLive`, so the transport can later
 * change (e.g. to a WebSocket gateway) by editing only this file.
 */
export function LiveProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [pushes, setPushes] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/summary", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setSummary(((await res.json()) as { data: DashboardSummary }).data);
    } catch (err) {
      console.error("[dashboard] refresh failed", err);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // Leaving the page cancels in-flight requests with a TypeError that never reaches `abort()`:
    // that is not a failure worth logging, and would bury a real one.
    let leaving = false;
    const onLeave = () => (leaving = true);
    window.addEventListener("pagehide", onLeave);

    // Snapshot for first paint, then again every POLL_MS while the tab is visible (and at once when
    // it becomes visible again).
    const poll = () =>
      fetch("/api/dashboard/summary", { signal: controller.signal, cache: "no-store" })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
        .then((body: { data: DashboardSummary }) => setSummary(body.data))
        .catch((err: unknown) => {
          if (!controller.signal.aborted && !leaving)
            console.error("[dashboard] snapshot failed", err);
        });
    void poll();
    const timer = setInterval(() => document.visibilityState === "visible" && void poll(), POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void poll();
    document.addEventListener("visibilitychange", onVisible);

    // EventSource reconnects on its own; the server advertises `retry: 3000`.
    const source = new EventSource("/api/dashboard/stream");
    source.onopen = () => setStatus("live");
    source.onerror = () => setStatus("reconnecting");
    source.addEventListener("dashboard.summary", (event) => {
      setSummary(JSON.parse((event as MessageEvent<string>).data) as DashboardSummary);
      setPushes((n) => n + 1);
      setStatus("live");
    });

    return () => {
      window.removeEventListener("pagehide", onLeave);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
      controller.abort();
      source.close();
    };
  }, []);

  return (
    <LiveContext.Provider value={{ summary, status, isLive: pushes > 0, refresh }}>
      {children}
    </LiveContext.Provider>
  );
}
