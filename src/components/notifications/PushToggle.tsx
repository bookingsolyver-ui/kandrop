"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { subscribeToPush } from "@/app/[locale]/dashboard/settings/pushActions";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";

/** The browser wants the VAPID key as bytes. */
function keyBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = base64Url.padEnd(base64Url.length + ((4 - (base64Url.length % 4)) % 4), "=").replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "checking" | "unsupported" | "idle" | "working" | "on" | "denied" | "failed";

/**
 * "Ativar Notificações no Dispositivo": asks for permission, registers the service worker, subscribes to push with the
 * public VAPID key and hands the subscription to the server action. Hidden when push is not configured or not supported.
 */
export function PushToggle({ scope, compact = false }: { scope: "merchant" | "admin"; compact?: boolean }) {
  const t = useTranslations("Notifications.push");
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    let alive = true;
    (async () => {
      await Promise.resolve();
      const supported = !!PUBLIC_KEY && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      let next: State = "unsupported";
      if (supported) {
        if (Notification.permission === "denied") next = "denied";
        else {
          // Already subscribed on this device?
          const sub = await navigator.serviceWorker.getRegistration("/sw.js").then((reg) => reg?.pushManager.getSubscription()).catch(() => null);
          next = sub && Notification.permission === "granted" ? "on" : "idle";
        }
      }
      if (alive) setState(next);
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function enable() {
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "idle");
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const subscription = (await registration.pushManager.getSubscription()) ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) }));
      const result = await subscribeToPush(subscription.toJSON(), scope);
      setState(result.ok ? "on" : "failed");
    } catch {
      setState("failed");
    }
  }

  if (state === "checking" || state === "unsupported") return null;
  const button = "inline-flex items-center gap-2 rounded-full font-semibold transition-colors disabled:opacity-60";
  return (
    <div className={compact ? "" : "space-y-2"}>
      {state === "on" ? (
        <p className={`${button} ${compact ? "h-9 border border-[var(--ink-200)] bg-white px-3 text-[13px] text-[var(--kai-success)]" : "text-sm text-up"}`} role="status">
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.2 4.2L19 7" /></svg>
          {t("on")}
        </p>
      ) : (
        <button type="button" onClick={() => void enable()} disabled={state === "working" || state === "denied"} className={`${button} ${compact ? "h-9 border border-[var(--ink-200)] bg-white px-3 text-[13px] text-[var(--ink-900)] hover:border-[var(--ink-300)]" : "h-12 bg-action px-6 text-[0.9375rem] text-on-action hover:opacity-90"}`}>
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
          {state === "working" ? t("working") : t("enable")}
        </button>
      )}
      {!compact && state === "denied" && <p role="alert" className="text-[13px] text-down">{t("denied")}</p>}
      {!compact && state === "failed" && <p role="alert" className="text-[13px] text-down">{t("failed")}</p>}
    </div>
  );
}
