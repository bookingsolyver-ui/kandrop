"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * The catalogue products a merchant starred. A per-browser convenience (like a remembered filter), NOT business
 * data: it lives in `localStorage` and is read through `useSyncExternalStore`. Imports, orders, stock and money
 * are all in the database.
 */
const KEYS = { favorites: "kandrop:favorites:v1" } as const;
const EVENT = "kandrop:vitrine-store";

type Key = keyof typeof KEYS;
const cache = new Map<Key, { raw: string | null; value: unknown }>();
const EMPTY: never[] = [];

function read<T>(key: Key): T[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEYS[key]);
  } catch {
    /* storage blocked (private mode): behave as empty */
  }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T[]; // same reference while nothing changed
  let value: T[] = [];
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    value = Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    value = [];
  }
  cache.set(key, { raw, value });
  return value;
}

function write<T>(key: Key, value: T[]) {
  try {
    window.localStorage.setItem(KEYS[key], JSON.stringify(value));
  } catch {
    /* quota or blocked: the change is lost, nothing else breaks */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange); // another tab
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function useList<T>(key: Key): [T[], boolean] {
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const list = useSyncExternalStore(
    subscribe,
    () => read<T>(key),
    () => EMPTY as T[]
  );
  return [list, hydrated];
}

/** The favourite catalogue products (ids). */
export function useFavorites() {
  const [ids, ready] = useList<string>("favorites");
  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const toggle = useCallback((id: string) => {
    const current = read<string>("favorites");
    write("favorites", current.includes(id) ? current.filter((x) => x !== id) : [id, ...current]);
  }, []);
  return { ids, ready, has, toggle };
}
