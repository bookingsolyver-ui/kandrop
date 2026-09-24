/**
 * Plain module (no "use client") on purpose: the server layout and the client shell both read
 * it, and a constant exported from a client module reaches server code as a reference, not a value.
 *
 * Not sensitive: the sidebar's width. A cookie (not localStorage) so the server renders it right
 * on the first paint, with no flash from wide to narrow.
 */
export const SIDEBAR_COOKIE = "kandrop_sidebar";
