"use client";

import Link from "next/link";
import { useShoppingList } from "./useShoppingList";

type Props = {
  slug: string;
  grams: number;
  compact?: boolean;
};

/** Adds the recipe at the chosen grams to the shopping list, or updates it if the grams changed. */
export function AddToListButton({ slug, grams, compact }: Props) {
  const list = useShoppingList();
  const entry = list.get(slug);

  const base =
    "inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition active:scale-[0.98]";

  if (!entry) {
    return (
      <button
        type="button"
        onClick={() => list.set(slug, grams)}
        className={`${base} bg-accent text-accent-ink hover:brightness-110 ${compact ? "" : "w-full"}`}
      >
        <span aria-hidden>＋</span> Add {grams}g to list
      </button>
    );
  }

  if (entry.grams !== grams) {
    return (
      <button
        type="button"
        onClick={() => list.set(slug, grams)}
        className={`${base} border border-accent text-accent hover:bg-accent-soft ${compact ? "" : "w-full"}`}
      >
        Update list to {grams}g
        <span className="font-normal text-muted">(now {entry.grams}g)</span>
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "w-full"}`}>
      <Link
        href="/list"
        className={`${base} flex-1 bg-herb-soft text-herb hover:brightness-95`}
      >
        <span aria-hidden>✓</span> On your list · View
      </Link>
      <button
        type="button"
        onClick={() => list.remove(slug)}
        aria-label="Remove from shopping list"
        className="grid size-11 shrink-0 place-items-center rounded-full border border-line text-muted transition hover:border-accent hover:text-accent"
      >
        ✕
      </button>
    </div>
  );
}
