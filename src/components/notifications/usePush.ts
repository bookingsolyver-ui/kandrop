"use client";

import { useCallback, useEffect, useState } from "react";
import { subscribeToPush } from "@/app/[locale]/dashboard/settings/pushActions";

export const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";

/** The browser wants the VAPID key as bytes. */
function keyBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = base64Url.padEnd(base64Url.length + ((4 - (base64Url.length % 4)) % 4), "=").replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * - `checking`: not known yet (the server render and the first browser render are the same: nothing shown);
 * - `unsupported`: no push support, or the platform has no VAPID key;
 * - `idle`: permission still to be asked (pending) or granted but this device is not subscribed yet;
 * - `denied`: the permission is blocked in this browser;
 * - `working` / `on` / `failed`: while enabling, enabled, and enabling failed.
 */
export type PushState = "checking" | "unsupported" | "idle" | "working" | "on" | "denied" | "failed";

/** Everything about Web Push on this device: its state and `enable()` (permission, service worker, subscription, backend). */
export function usePush(scope: "merchant" | "admin") {
  const [state, setState] = useState<PushState>("checking");
  const [justEnabled, setJustEnabled] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      await Promise.resolve();
      const supported = !!PUBLIC_KEY && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      let next: PushState = "unsupported";
      if (supported) {
        if (Notification.permission === "denied") next = "denied";
        else {
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

  const enable = useCallback(async () => {
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "idle");
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const subscription = (await registration.pushManager.getSubscription()) ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) }));
      // The subscription goes to the backend (saved in Supabase for this store/administrator).
      const result = await subscribeToPush(subscription.toJSON(), scope);
      setState(result.ok ? "on" : "failed");
      if (result.ok) setJustEnabled(true);
    } catch {
      setState("failed");
    }
  }, [scope]);

  return { state, enable, justEnabled };
}
