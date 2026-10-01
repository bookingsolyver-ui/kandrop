"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { ImportedProduct } from "@/shared/vitrine/imported";

/**
 * Client-side store of the demo: the products a merchant imported from the Vitrine and the ones they
 * marked as favourites. It lives in `localStorage` (so it survives reloads and is shared by every
 * page and tab) and is read through `useSyncExternalStore`. When the Supabase tables exist, only this
 * file changes: the hooks keep their shape.
 */
const KEYS = { products: "kandrop:my-products:v1", favorites: "kandrop:favorites:v1" } as const;
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

/** The imported products. `ready` is false on the server and during hydration. */
export function useMyProducts() {
  const [items, ready] = useList<ImportedProduct>("products");
  const has = useCallback((id: string) => items.some((p) => p.id === id), [items]);
  /** Adds a product; `false` when it was already there. */
  const add = useCallback((product: ImportedProduct) => {
    const current = read<ImportedProduct>("products");
    if (current.some((p) => p.id === product.id)) return false;
    write("products", [product, ...current]);
    return true;
  }, []);
  const update = useCallback((id: string, patch: Partial<ImportedProduct>) => {
    write("products", read<ImportedProduct>("products").map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);
  const remove = useCallback((id: string) => {
    write("products", read<ImportedProduct>("products").filter((p) => p.id !== id));
  }, []);
  return { items, ready, has, add, update, remove };
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
