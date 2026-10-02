"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

type Scope = "merchant" | "supplier" | "admin";
interface Item { id: string; kind: "sale" | "supply" | "platform"; orderNumber: number; amount: number | null; at: number }
interface Toast { key: string; kind: Item["kind"]; text: string }

const POLL_MS = 12_000;
const SHOW_MS = 7_000;

const svg = { "aria-hidden": true, width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;
/** One plain SVG per audience: a bag for a sale, a package for a supply order, a pulse for the platform. */
const ICON: Record<Item["kind"], React.ReactNode> = {
  sale: <svg {...svg}><path d="M5 8h14l-1 12H6Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></svg>,
  supply: <svg {...svg}><path d="m12 3 8 4.2v9.6L12 21l-8-4.2V7.2Z" /><path d="m4 7.2 8 4.3 8-4.3M12 11.5V21" /></svg>,
  platform: <svg {...svg}><path d="M3 12h4l3-7 4 14 3-7h4" /></svg>,
};
const TONE: Record<Item["kind"], string> = {
  sale: "bg-[var(--kai-success-bg)] text-[var(--kai-success)]",
  supply: "bg-[var(--kai-orange-50)] text-[var(--kai-orange-600)]",
  platform: "bg-[var(--ink-100)] text-[var(--ink-800,var(--ink-900))]",
};

/**
 * Live sale alerts for the panel that mounts it (merchant, supplier or admin). The browser asks the server every few
 * seconds for sales newer than the last one it saw; the server decides WHAT this person may be told from their session.
 * Nothing here talks to the database: the tables stay closed (row security on, no public policies).
 * Pauses while the tab is hidden and catches up when it comes back. Each sale is shown once.
 */
export function RealtimeNotifications({ scope }: { scope: Scope }) {
  const t = useTranslations("Notifications");
  const format = useFormatter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const since = useRef<number | null>(null);
  const seen = useRef(new Set<string>());

  const money = useCallback((minor: number) => `${format.number(Math.round(minor / 100))} Kz`, [format]);

  const poll = useCallback(async () => {
    try {
      const url = `/api/notifications?scope=${scope}${since.current === null ? "" : `&since=${since.current}`}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const body = (await res.json()) as { data?: { now: number; items: Item[] } };
      if (!body.data) return;
      const fresh = body.data.items.filter((i) => !seen.current.has(i.id));
      since.current = Math.max(body.data.now, ...body.data.items.map((i) => i.at));
      if (fresh.length === 0) return;
      for (const i of fresh) seen.current.add(i.id);
      const made = fresh.slice(-3).map<Toast>((i) => ({
        key: i.id,
        kind: i.kind,
        text: i.kind === "sale" ? t("sale", { amount: money(i.amount ?? 0) }) : i.kind === "supply" ? t("supply") : t("platform", { amount: money(i.amount ?? 0) }),
      }));
      setToasts((list) => [...list, ...made].slice(-3));
      for (const m of made) window.setTimeout(() => setToasts((list) => list.filter((x) => x.key !== m.key)), SHOW_MS);
    } catch {
      /* offline or a hiccup: the next poll tries again */
    }
  }, [scope, t, money]);

  useEffect(() => {
    void poll(); // the baseline: only the server clock, no old sales
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void poll(); }, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void poll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [poll]);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed top-4 right-4 z-[70] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.key} className="animate-fade-in pointer-events-auto flex items-start gap-3 rounded-2xl border border-[var(--ink-200)] bg-white p-3.5 shadow-[var(--sh-md)]">
          <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${TONE[toast.kind]}`}>{ICON[toast.kind]}</span>
          <p className="min-w-0 flex-1 pt-1.5 text-sm leading-snug font-semibold text-[var(--ink-900)]">{toast.text}</p>
          <button type="button" onClick={() => setToasts((list) => list.filter((x) => x.key !== toast.key))} aria-label={t("close")} className="grid size-7 shrink-0 place-items-center rounded-full text-[var(--ink-500)] hover:bg-[var(--ink-100)]">
            <svg {...svg} width="14" height="14"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
      ))}
    </div>
  );
}
