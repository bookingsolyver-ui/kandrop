/**
 * Meta (Facebook) Pixel helpers, MULTI-TENANT. Two kinds of pixel can be active on a page:
 *  - the PLATFORM pixel (`NEXT_PUBLIC_META_PIXEL_ID`, Kandrop's own audience), on every public page;
 *  - the MERCHANT's pixel (`stores.settings.meta_pixel_id`), only while a page of THAT merchant's store is open
 *    (product page, checkout, order confirmation), registered by `<StorePixel />`.
 * Every event goes out with `trackSingle`, naming the pixel explicitly, so a merchant's pixel can never receive events
 * of another store or of a page that is not theirs, and the platform pixel never depends on what a merchant set.
 * Without any pixel configured every function here does nothing, so the app never depends on it.
 *
 * `window.fbq` is created by the base snippet that `<MetaPixel />` / `<StorePixel />` inject AFTER the page is
 * interactive, so commands asked for earlier wait in `window.__metaPixelQueue` and are replayed, in order, by the snippet.
 */
const raw = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? "";

/** A Meta pixel id is digits only (it is also written into scripts and stored per store, so nothing else is accepted). */
export const isPixelId = (value: unknown): value is string => typeof value === "string" && /^\d{6,20}$/.test(value);

/** The platform's pixel id, or `null`. */
export const META_PIXEL_ID: string | null = isPixelId(raw) ? raw : null;

/**
 * PRIVACY: no pixel may run inside the platform's own panels. Their URLs are private and their visitors are the team,
 * merchants and suppliers, not shoppers. Paths are matched without the locale prefix.
 */
const PRIVATE_PREFIXES = ["/admin", "/dashboard", "/fornecedor", "/supplier"] as const;
export function isPrivatePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.replace(/^\/(pt|en|fr)(?=\/|$)/, "") || "/";
  return PRIVATE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

type FbqArgs = Parameters<NonNullable<Window["fbq"]>>;

function send(...args: FbqArgs) {
  if (typeof window === "undefined") return;
  // Last line of defence: whatever asks, nothing is sent from a private route.
  if (isPrivatePath(window.location.pathname)) return;
  try {
    if (typeof window.fbq === "function") window.fbq(...args);
    else (window.__metaPixelQueue ??= []).push(args);
  } catch {
    /* tracking must never break the page */
  }
}

const initialised = new Set<string>();
/** `init` once per pixel (and Meta's automatic click/metadata collection off). */
function ensureInit(id: string) {
  if (initialised.has(id)) return;
  initialised.add(id);
  send("set", "autoConfig", false, id);
  send("init", id);
}

/** The merchant pixel of the store page that is open right now (`null` elsewhere). */
let storePixel: string | null = null;
export function registerStorePixel(id: string | null) {
  storePixel = id && isPixelId(id) ? id : null;
  if (storePixel) ensureInit(storePixel);
}

/** The pixels that should hear about an event now: the platform's and, on a store page, that store's. */
const targets = (): string[] => [META_PIXEL_ID, storePixel].filter((id): id is string => !!id);

function trackSingle(id: string, name: string, options?: Record<string, unknown>, eventID?: string) {
  ensureInit(id);
  send("trackSingle", id, name, options ?? {}, eventID ? { eventID } : undefined);
}

/** A page view for the platform pixel (every public page, first load and every client-side navigation). */
export function platformPageview() {
  if (META_PIXEL_ID) trackSingle(META_PIXEL_ID, "PageView");
}

/** A page view for the open store's own pixel. */
export function storePageview() {
  if (storePixel) trackSingle(storePixel, "PageView");
}

/** A standard or custom event, sent to EVERY active pixel. `eventID` lets Meta de-duplicate the same event sent twice. */
export function event(name: string, options?: Record<string, unknown>, eventID?: string) {
  for (const id of targets()) trackSingle(id, name, options, eventID);
}
