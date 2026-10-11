"use client";

import { useShoppingList } from "./useShoppingList";
import { useStoredState } from "./useStoredState";

/** Round add/remove toggle for recipe cards; uses the grams last chosen on that recipe's page. */
export function CardAddButton({ slug, baseGrams, title }: { slug: string; baseGrams: number; title: string }) {
  const list = useShoppingList();
  const [grams] = useStoredState(`grams:${slug}`, baseGrams);
  const entry = list.get(slug);

  return (
    <button
      type="button"
      onClick={() => (entry ? list.remove(slug) : list.set(slug, grams))}
      aria-pressed={!!entry}
      aria-label={entry ? `Remove ${title} from shopping list` : `Add ${title} (${grams}g) to shopping list`}
      title={entry ? `On your list (${entry.grams}g). Click to remove` : `Add ${grams}g to shopping list`}
      className={`flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition active:scale-95 ${
        entry
          ? "bg-herb-soft text-herb hover:brightness-95"
          : "border border-line bg-surface text-ink hover:border-accent hover:text-accent"
      }`}
    >
      <span aria-hidden>{entry ? "✓" : "＋"}</span>
      {entry ? "Listed" : "List"}
    </button>
  );
}
