/**
 * Meta (Facebook) Pixel helpers. The pixel only exists when `NEXT_PUBLIC_META_PIXEL_ID` is set (a numeric id): without
 * it every function here does nothing, so the app never depends on it.
 *
 * `window.fbq` is created by the snippet that `<MetaPixel />` injects AFTER the page is interactive, so a component
 * can ask for an event before it exists. Those calls wait in `window.__metaPixelQueue` and the snippet replays them.
 */
const raw = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? "";
/** The configured pixel id, or `null`. Digits only: it is written into an inline script, so nothing else is accepted. */
export const META_PIXEL_ID: string | null = /^\d{6,20}$/.test(raw) ? raw : null;

type FbqArgs = Parameters<NonNullable<Window["fbq"]>>;

function call(...args: FbqArgs) {
  if (!META_PIXEL_ID || typeof window === "undefined") return;
  try {
    if (typeof window.fbq === "function") window.fbq(...args);
    else (window.__metaPixelQueue ??= []).push(args);
  } catch {
    /* tracking must never break the page */
  }
}

/** A page view (the snippet fires the first one; the route tracker fires the later ones). */
export const pageview = () => call("track", "PageView");

/** A standard or custom event. `eventID` lets Meta de-duplicate the same event sent twice (e.g. a later server event). */
export const event = (name: string, options?: Record<string, unknown>, eventID?: string) =>
  call("track", name, options, eventID ? { eventID } : undefined);
