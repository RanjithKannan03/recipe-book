"use client";

import { useMemo, useState } from "react";
import type { Recipe } from "@/lib/parse";
import { formatFactor, scaleIngredient } from "@/lib/scale";
import { AddToListButton } from "./AddToListButton";
import { GramsControl } from "./GramsControl";
import { IngredientList } from "./IngredientList";
import { Inline } from "./Inline";
import { Callout } from "./ui";
import { useStoredState } from "./useStoredState";

const PRESETS = [300, 450, 500, 600, 750, 900, 1000, 1500, 2000];

function sectionIcon(title: string): string {
  if (/stor|freez/i.test(title)) return "🧊";
  if (/roll|wrap/i.test(title)) return "🌯";
  return "💡";
}

export function RecipeScaler({ recipe }: { recipe: Recipe }) {
  const base = recipe.baseGrams;
  const [grams, setGrams] = useStoredState(`grams:${recipe.slug}`, base);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const factor = grams / base;
  const presets = useMemo(() => [...new Set([...PRESETS, base])].sort((a, b) => a - b), [base]);
  const groups = useMemo(
    () =>
      recipe.groups.map((g) => ({
        title: g.title,
        items: g.items.map((i) => scaleIngredient(i, factor, grams)),
      })),
    [recipe.groups, factor, grams],
  );

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const control = (compact: boolean) => (
    <GramsControl value={grams} onChange={setGrams} presets={presets} badge={formatFactor(factor)} compact={compact} />
  );

  return (
    <div>
      {/* Phones/tablets: the grams control stays pinned while scrolling */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:hidden">
        {control(true)}
      </div>

      <div className="mt-6 grid gap-8 lg:mt-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto lg:rounded-3xl">
          <div className="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
            <div className="mb-6 hidden space-y-4 border-b border-line pb-6 lg:block">
              {control(false)}
              <AddToListButton slug={recipe.slug} grams={grams} />
            </div>
            <div className="mb-5 lg:hidden">
              <AddToListButton slug={recipe.slug} grams={grams} />
            </div>

            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-semibold">Ingredients</h2>
                <p className="text-sm text-muted">
                  Scaled for <span className="font-medium text-ink tabular-nums">{grams}g</span> · original {base}g
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                {checked.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setChecked(new Set())}
                    className="h-9 rounded-full px-3 text-sm text-muted hover:bg-surface-2 hover:text-ink"
                  >
                    Untick
                  </button>
                )}
                {grams !== base && (
                  <button
                    type="button"
                    onClick={() => setGrams(base)}
                    className="h-9 rounded-full px-3 text-sm text-muted hover:bg-surface-2 hover:text-ink"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            <IngredientList groups={groups} checked={checked} onToggle={toggle} />
          </div>
        </aside>

        <section>
          <h2 className="mb-5 font-display text-2xl font-semibold">Method</h2>
          <ol className="space-y-5">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span
                  aria-hidden
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft font-display text-base font-semibold text-accent"
                >
                  {i + 1}
                </span>
                <p className="pt-1.5 leading-relaxed">
                  <Inline text={step} />
                </p>
              </li>
            ))}
          </ol>

          {recipe.sections.length > 0 && (
            <div className="mt-10 space-y-4">
              {recipe.sections.map((sec) => (
                <section key={sec.title} className="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
                  <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
                    <span aria-hidden>{sectionIcon(sec.title)}</span>
                    {sec.title}
                  </h2>
                  <ul className="mt-3 space-y-2 text-[15px] leading-relaxed">
                    {sec.items.map((t) => (
                      <li key={t} className="flex gap-2">
                        <span aria-hidden className="text-accent">
                          •
                        </span>
                        <span>
                          <Inline text={t} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {(recipe.callouts.length > 0 || recipe.notes.length > 0) && (
            <div className="mt-8 space-y-3">
              {recipe.callouts.map((c) => (
                <Callout key={c} text={c} icon="🌀" />
              ))}
              {recipe.notes.map((n) => (
                <Callout key={n} text={n} icon="📊" />
              ))}
            </div>
          )}

          {factor !== 1 && (
            <p className="mt-6 text-sm text-muted">
              Method times stay the same; cook in batches if the pan or air fryer basket gets crowded.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
