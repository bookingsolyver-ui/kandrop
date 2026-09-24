"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import type { PlanUsage } from "@/server/modules/plan/service";

/** Dispatched on `window` when the plan changes without a page change (a plan was just paid). */
export const PLAN_CHANGED = "kandrop:plan-changed";

const PlanContext = createContext<PlanUsage | null>(null);

/** Two plan cards exist (sidebar and phone drawer); one fetch feeds both. */
export const usePlan = () => useContext(PlanContext);

/**
 * The plan and its usage, fetched again on every navigation: the layout is not re-rendered when
 * you move between pages, so it cannot carry numbers that change (adding a product moves the bar).
 */
export function PlanProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [plan, setPlan] = useState<PlanUsage | null>(null);
  const [tick, setTick] = useState(0);

  // A payment inside a page (no navigation) changes the plan: the billing dialog announces it.
  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    window.addEventListener(PLAN_CHANGED, bump);
    return () => window.removeEventListener(PLAN_CHANGED, bump);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/plan", { signal: controller.signal, cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((body: { data: PlanUsage }) => setPlan(body.data))
      .catch(() => {
        /* aborted, or offline: the card keeps the last numbers it had */
      });
    return () => controller.abort();
  }, [pathname, tick]);

  return <PlanContext.Provider value={plan}>{children}</PlanContext.Provider>;
}
