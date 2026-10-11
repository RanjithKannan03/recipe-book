"use client";

import Link from "next/link";
import { useShoppingList } from "./useShoppingList";

export function ListNavLink() {
  const { items } = useShoppingList();
  return (
    <Link
      href="/list"
      className="relative flex items-center gap-1.5 rounded-full px-3 py-2 text-muted hover:bg-surface-2 hover:text-ink"
    >
      <span aria-hidden>🛒</span>
      <span className="hidden sm:inline">Shopping list</span>
      <span className="sm:hidden">List</span>
      {items.length > 0 && (
        <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold leading-5 text-accent-ink tabular-nums">
          {items.length}
        </span>
      )}
    </Link>
  );
}
