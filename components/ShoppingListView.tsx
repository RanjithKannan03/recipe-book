"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { Blend, Recipe, Usage } from "@/lib/parse";
import { buildShoppingList, shoppingListText, type ShoppingEntry, type ShoppingLine } from "@/lib/shopping";
import { GramsControl } from "./GramsControl";
import { blendKey, useShoppingList } from "./useShoppingList";
import { useStoredState } from "./useStoredState";

const noop = () => () => {};
/** False during server render and hydration, true afterwards (the list only exists in the browser). */
const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);

function Line({ line, done, onToggle }: { line: ShoppingLine; done: boolean; onToggle: () => void }) {
  return (
    <li>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2.5">
        <input
          type="checkbox"
          checked={done}
          onChange={onToggle}
          className="mt-0.5 size-[1.125rem] shrink-0 cursor-pointer accent-[var(--accent)]"
        />
        <span className={`min-w-0 flex-1 leading-snug transition ${done ? "text-muted line-through" : ""}`}>
          {line.amount && <span className="font-semibold tabular-nums">{line.amount}</span>} {line.name}
          {line.optional && <span className="ml-1.5 text-xs text-muted">(optional)</span>}
        </span>
        <span className="flex shrink-0 gap-1 pt-0.5">
          {line.sources.map((t) => (
            <span
              key={t.title}
              title={`Used in ${t.title}`}
              className="grid h-5 min-w-5 place-items-center rounded-full bg-surface-2 px-1.5 text-[0.6875rem] font-semibold text-muted tabular-nums"
            >
              {t.label}
            </span>
          ))}
        </span>
      </label>
    </li>
  );
}

type Props = { recipes: Recipe[]; blends: Blend[]; usage: Usage[] };

export function ShoppingListView({ recipes, blends, usage }: Props) {
  const hydrated = useHydrated();
  const list = useShoppingList();
  const [ticked, setTicked] = useStoredState<string[]>("shopping-ticks:v1", []);
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const [confirmClear, setConfirmClear] = useState(false);

  const entries = useMemo(
    () =>
      list.items.flatMap((i): ShoppingEntry[] => {
        const recipe = recipes.find((r) => r.slug === i.slug);
        if (recipe) return [{ recipe, grams: i.grams }];
        const blend = blends.find((b) => blendKey(b.slug) === i.slug);
        if (blend) return [{ blend, usage: usage[i.cut ?? 0] ?? usage[0], grams: i.grams, jar: !!i.jar }];
        return [];
      }),
    [list.items, recipes, blends, usage],
  );
  const recipeEntries = entries.flatMap((e) => ("recipe" in e ? [e] : []));
  const blendEntries = entries.flatMap((e) => ("blend" in e ? [e] : []));
  const shopping = useMemo(() => buildShoppingList(entries), [entries]);

  useEffect(() => {
    if (copied === "idle") return;
    const t = setTimeout(() => setCopied("idle"), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    if (!confirmClear) return;
    const t = setTimeout(() => setConfirmClear(false), 3000);
    return () => clearTimeout(t);
  }, [confirmClear]);

  if (!hydrated) return <div className="h-64" aria-hidden />;

  if (entries.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-line bg-surface px-6 py-14 text-center">
        <p aria-hidden className="text-4xl">
          🛒
        </p>
        <h2 className="mt-3 font-display text-2xl font-semibold">Your list is empty</h2>
        <p className="mx-auto mt-2 max-w-sm text-muted">
          Open a recipe or seasoning blend, set how much chicken you bought, and tap{" "}
          <strong className="text-ink">Add to list</strong>. Add a few and everything gets combined here.
        </p>
        <Link
          href="/#recipes"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-accent px-5 font-semibold text-accent-ink hover:brightness-110"
        >
          Browse recipes
        </Link>
      </div>
    );
  }

  const tickedSet = new Set(ticked);
  const allKeys = [...shopping.sections.flatMap((s) => s.lines), ...shopping.extras].map((l) => l.key);
  const doneCount = allKeys.filter((k) => tickedSet.has(k)).length;
  const toggle = (key: string) => setTicked(tickedSet.has(key) ? ticked.filter((k) => k !== key) : [...ticked, key]);
  const totalChicken = entries.reduce((sum, e) => sum + ("jar" in e && e.jar ? 0 : e.grams), 0);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shoppingListText(shopping));
      setCopied("done");
    } catch {
      setCopied("failed");
    }
  };

  const actionBtn =
    "inline-flex h-11 flex-1 items-center justify-center rounded-full border border-line px-4 text-sm font-semibold transition hover:border-accent hover:text-accent";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-10">
      <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto lg:rounded-3xl">
        <div className="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold">On your list</h2>
            <p className="text-sm text-muted tabular-nums">{totalChicken}g chicken in total</p>
          </div>

          <ul className="mt-4 divide-y divide-line">
            {recipeEntries.map(({ recipe, grams }) => (
              <li key={recipe.slug} className="py-4 first:pt-0">
                <div className="mb-3 flex items-start gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent tabular-nums">
                    {recipe.number}
                  </span>
                  <Link
                    href={`/recipes/${recipe.slug}`}
                    className="min-w-0 flex-1 pt-0.5 font-medium leading-snug hover:text-accent"
                  >
                    {recipe.title}
                  </Link>
                  <button
                    type="button"
                    onClick={() => list.remove(recipe.slug)}
                    aria-label={`Remove ${recipe.title}`}
                    className="-mt-1 grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-accent"
                  >
                    ✕
                  </button>
                </div>
                <GramsControl
                  value={grams}
                  onChange={(g) => list.set(recipe.slug, g)}
                  presets={[]}
                  label="Chicken"
                  compact
                />
              </li>
            ))}
            {blendEntries.map(({ blend, usage: u, grams, jar }) => {
              const key = blendKey(blend.slug);
              return (
                <li key={key} className="py-4 first:pt-0">
                  <div className="mb-3 flex items-start gap-3">
                    <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-herb-soft text-xs text-herb">
                      ✦
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5 leading-snug">
                      <Link href={`/seasonings#${blend.slug}`} className="font-medium hover:text-accent">
                        {blend.name} blend
                      </Link>
                      <p className="text-sm text-muted">
                        {jar ? "Month jar (×4), spices only" : `With chicken, oil and wet extras · ${u.label}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => list.remove(key)}
                      aria-label={`Remove ${blend.name} blend`}
                      className="-mt-1 grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-accent"
                    >
                      ✕
                    </button>
                  </div>
                  {!jar && (
                    <GramsControl
                      value={grams}
                      onChange={(g) => list.set(key, g)}
                      presets={[]}
                      label="Chicken"
                      compact
                    />
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-1 flex gap-2">
            {[
              { href: "/#recipes", label: "＋ Add a recipe" },
              { href: "/seasonings", label: "＋ Add a blend" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex h-11 flex-1 items-center justify-center rounded-full border border-dashed border-line text-sm font-medium text-muted transition hover:border-accent hover:text-accent"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button type="button" onClick={copy} className={actionBtn}>
              {copied === "done" ? "✓ Copied" : copied === "failed" ? "Couldn't copy" : "Copy list"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!confirmClear) return setConfirmClear(true);
                list.clear();
                setTicked([]);
                setConfirmClear(false);
              }}
              className={`${actionBtn} ${confirmClear ? "border-accent bg-accent text-accent-ink hover:text-accent-ink" : ""}`}
            >
              {confirmClear ? "Tap again to clear" : "Clear list"}
            </button>
          </div>
        </div>
      </aside>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold">Shopping list</h2>
            <p className="text-sm text-muted tabular-nums">
              {doneCount} of {allKeys.length} ticked · tags show which recipe or blend uses it
            </p>
          </div>
          {doneCount > 0 && (
            <button
              type="button"
              onClick={() => setTicked([])}
              className="h-9 shrink-0 rounded-full px-3 text-sm text-muted hover:bg-surface-2 hover:text-ink"
            >
              Untick all
            </button>
          )}
        </div>

        <div
          className="mb-5 h-1.5 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={allKeys.length}
          aria-valuenow={doneCount}
          aria-label="Items ticked"
        >
          <div
            className="h-full rounded-full bg-herb transition-[width] duration-300"
            style={{ width: `${allKeys.length ? (doneCount / allKeys.length) * 100 : 0}%` }}
          />
        </div>

        <div className="space-y-4">
          {shopping.sections.map((s) => (
            <section key={s.aisle} className="rounded-3xl border border-line bg-surface px-5 py-4 shadow-card sm:px-6">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">{s.aisle}</h3>
              <ul className="mt-1 divide-y divide-line/70">
                {s.lines.map((l) => (
                  <Line key={l.key} line={l} done={tickedSet.has(l.key)} onToggle={() => toggle(l.key)} />
                ))}
              </ul>
            </section>
          ))}

          {shopping.extras.length > 0 && (
            <section className="rounded-3xl border border-dashed border-line px-5 py-4 sm:px-6">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Also check you have</h3>
              <ul className="mt-1 divide-y divide-line/70">
                {shopping.extras.map((l) => (
                  <Line key={l.key} line={l} done={tickedSet.has(l.key)} onToggle={() => toggle(l.key)} />
                ))}
              </ul>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}
