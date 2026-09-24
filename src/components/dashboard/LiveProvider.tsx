"use client";

import { createContext, useEffect, useState, type ReactNode } from "react";
import type { DashboardSummary } from "@/server/modules/dashboard/schema";

export type LiveStatus = "connecting" | "live" | "reconnecting";

export interface LiveState {
  summary: DashboardSummary | null;
  status: LiveStatus;
  /** `true` once a pushed update has arrived: values changing now are live changes. */
  isLive: boolean;
}

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

  useEffect(() => {
    const controller = new AbortController();
    // Leaving the page cancels in-flight requests with a TypeError that never reaches `abort()`:
    // that is not a failure worth logging, and would bury a real one.
    let leaving = false;
    const onLeave = () => (leaving = true);
    window.addEventListener("pagehide", onLeave);

    fetch("/api/dashboard/summary", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((body: { data: DashboardSummary }) => setSummary((current) => current ?? body.data))
      .catch((err: unknown) => {
        if (!controller.signal.aborted && !leaving)
          console.error("[dashboard] snapshot failed", err);
      });

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
      controller.abort();
      source.close();
    };
  }, []);

  return (
    <LiveContext.Provider value={{ summary, status, isLive: pushes > 0 }}>
      {children}
    </LiveContext.Provider>
  );
}
