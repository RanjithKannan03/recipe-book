"use client";

import { useSyncExternalStore } from "react";

// The shopping list (which recipes, at how many grams) lives in localStorage and is shared by
// every component on the page and across tabs.

export type ListItem = { slug: string; grams: number };

const KEY = "shopping-list:v1";
const EMPTY: ListItem[] = [];
const listeners = new Set<() => void>();
let cache: ListItem[] | null = null;

function read(): ListItem[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i): i is ListItem => typeof i?.slug === "string" && typeof i?.grams === "number" && i.grams > 0,
    );
  } catch {
    return [];
  }
}

function write(items: ListItem[]) {
  cache = items;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // storage unavailable: the list still works until the page is closed
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = read();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => (cache ??= read());
const getServerSnapshot = () => EMPTY;

export function useShoppingList() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const current = () => getSnapshot();

  return {
    items,
    get: (slug: string) => items.find((i) => i.slug === slug),
    /** Adds the recipe, or updates its grams if it is already on the list. */
    set: (slug: string, grams: number) => {
      const list = current();
      write(list.some((i) => i.slug === slug) ? list.map((i) => (i.slug === slug ? { slug, grams } : i)) : [...list, { slug, grams }]);
    },
    remove: (slug: string) => write(current().filter((i) => i.slug !== slug)),
    clear: () => write([]),
  };
}
