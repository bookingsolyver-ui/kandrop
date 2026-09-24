"use client";

import { useEffect } from "react";
import type { PublicPayment } from "@/server/modules/payments/schema";

/** Short on purpose: the payer is usually already in their app, and the wait should feel brief. */
const POLL_MS = 1500;

/**
 * While a mobile-money confirmation is pending, asks the server how it went and calls
 * `onSettled` once, with the final payment. Short polling is enough here: the payer has no
 * session, so the merchant's real-time channel is not theirs. Used by the buyer's checkout and
 * by the merchant's plan-payment dialog.
 */
export function usePaymentPolling(
  paymentId: string | null,
  onSettled: (payment: PublicPayment) => void
) {
  useEffect(() => {
    if (!paymentId) return;
    let stopped = false;
    let busy = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (busy || stopped) return;
      busy = true;
      clearTimeout(timer);
      try {
        const res = await fetch(`/api/payments/${paymentId}`, { cache: "no-store" });
        const body = (await res.json()) as { data?: PublicPayment };
        if (stopped) return;
        if (body.data && body.data.status !== "pending") {
          stopped = true;
          return onSettled(body.data);
        }
      } catch {
        /* transient network error: keep waiting, the next poll will retry */
      } finally {
        busy = false;
      }
      if (!stopped) timer = setTimeout(poll, POLL_MS);
    };

    // Payers switch to their bank app and back. Phones freeze timers in a background tab, so
    // look again the moment this one is visible instead of waiting for the next tick.
    const onVisible = () => document.visibilityState === "visible" && void poll();
    document.addEventListener("visibilitychange", onVisible);
    timer = setTimeout(poll, POLL_MS);

    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [paymentId, onSettled]);
}
