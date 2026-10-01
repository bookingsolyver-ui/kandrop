"use client";

import { useEffect } from "react";
import { event } from "@/lib/meta-pixel";

/**
 * Fires one Meta Pixel event when it mounts. With `onceKey` it also remembers (in this browser) that it already fired,
 * so reloading the page cannot count the same purchase twice. Renders nothing.
 */
export function PixelEvent({ name, options, eventID, onceKey }: { name: string; options?: Record<string, unknown>; eventID?: string; onceKey?: string }) {
  const payload = JSON.stringify(options ?? {});
  useEffect(() => {
    if (onceKey) {
      try {
        if (window.localStorage.getItem(onceKey)) return;
        window.localStorage.setItem(onceKey, "1");
      } catch {
        /* storage blocked: fire anyway */
      }
    }
    event(name, JSON.parse(payload) as Record<string, unknown>, eventID);
  }, [name, payload, eventID, onceKey]);
  return null;
}
