"use client";

import { useSyncExternalStore } from "react";

/**
 * A tiny `localStorage`-backed list, read through `useSyncExternalStore`: every page and tab sees the same
 * data and re-renders when it changes. It is the demo's database; the real one (Supabase) replaces the
 * stores built on top of it, not the components that use them.
 */
const EVENT = "kandrop:local-store";
const cache = new Map<string, { raw: string | null; value: unknown }>();
const EMPTY: never[] = [];

export function readList<T>(key: string): T[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    /* storage blocked: behave as empty */
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

export function writeList<T>(key: string, value: T[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or blocked: the change is lost, nothing else breaks */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The list and whether it has been read (false on the server and during hydration). */
export function useLocalList<T>(key: string): [T[], boolean] {
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const list = useSyncExternalStore(
    subscribe,
    () => readList<T>(key),
    () => EMPTY as T[]
  );
  return [list, ready];
}
