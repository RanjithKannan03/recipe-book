"use client";

import Link from "next/link";
import { blendKey, useShoppingList } from "./useShoppingList";

type Props = { slug: string; name: string; grams: number; cut: number; jar: boolean };

/** Adds a blend, sized for the planner's current chicken, cut and jar setting, to the shopping list. */
export function BlendAddButton({ slug, name, grams, cut, jar }: Props) {
  const list = useShoppingList();
  const key = blendKey(slug);
  const entry = list.get(key);
  const what = jar ? "month jar" : `${grams}g`;
  const same = entry && !!entry.jar === jar && (jar || (entry.grams === grams && (entry.cut ?? 0) === cut));

  const base =
    "inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition active:scale-[0.98]";

  if (!entry) {
    return (
      <button
        type="button"
        onClick={() => list.set(key, grams, { cut, jar })}
        aria-label={`Add ${name} blend (${what}) to shopping list`}
        className={`${base} w-full border border-line text-ink hover:border-accent hover:text-accent`}
      >
        <span aria-hidden>＋</span> Add {what} to list
      </button>
    );
  }

  if (!same) {
    return (
      <button
        type="button"
        onClick={() => list.set(key, grams, { cut, jar })}
        className={`${base} w-full border border-accent text-accent hover:bg-accent-soft`}
      >
        Update list to {what}
        <span className="font-normal text-muted">(now {entry.jar ? "jar" : `${entry.grams}g`})</span>
      </button>
    );
  }

  return (
    <div className="flex w-full items-center gap-2">
      <Link href="/list" className={`${base} flex-1 bg-herb-soft text-herb hover:brightness-95`}>
        <span aria-hidden>✓</span> On your list · View
      </Link>
      <button
        type="button"
        onClick={() => list.remove(key)}
        aria-label={`Remove ${name} blend from shopping list`}
        className="grid size-11 shrink-0 place-items-center rounded-full border border-line text-muted transition hover:border-accent hover:text-accent"
      >
        ✕
      </button>
    </div>
  );
}
