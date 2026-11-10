"use client";

import { useState } from "react";
import type { Recipe } from "@/lib/parse";
import { MICROS, divide, recipeNutrition, servingSplit, type Nutrients } from "@/lib/nutrition";
import { servings } from "@/lib/scale";

function fmt(v: number, unit: "g" | "mg" | "kcal", key?: string): string {
  if (unit === "kcal") return String(Math.round(v / 5) * 5);
  if (key === "salt" || (unit === "g" && v < 10)) return (Math.round(v * 10) / 10).toFixed(1);
  return String(Math.round(v));
}

const MACROS: { key: keyof Nutrients; label: string; unit: "g" | "kcal" }[] = [
  { key: "kcal", label: "Calories", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
];

/** Estimated macros and micros for the recipe at the chosen weight, per serving or for the whole batch. */
export function NutritionCard({ recipe, grams }: { recipe: Recipe; grams: number }) {
  const [view, setView] = useState<"serving" | "batch">("serving");
  const { total, unmatched } = recipeNutrition(recipe, grams);
  const serve = servings(recipe, grams);
  const split = servingSplit(grams, serve?.count, recipe.makes?.one);
  const shown = view === "serving" ? divide(total, split.count) : total;
  const servingNote =
    view === "serving"
      ? `Estimate ${split.label}`
      : `Estimate for the whole batch: ${grams}g${serve ? `, ${serve.count} ${serve.label}` : ""}`;

  return (
    <section className="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <span aria-hidden>📊</span>
          Nutrition
        </h2>
        <div role="radiogroup" aria-label="Show nutrition for" className="flex rounded-full border border-line bg-surface-2 p-1">
          {(
            [
              ["serving", serve && recipe.makes ? `Per ${recipe.makes.one}` : "Per portion"],
              ["batch", "Whole batch"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => setView(v)}
              className={`h-9 rounded-full px-3.5 text-sm font-medium transition ${
                view === v ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">{servingNote}</p>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MACROS.map((m) => (
          <div key={m.key} className={`rounded-2xl px-4 py-3 ${m.key === "protein" ? "bg-accent-soft" : "bg-surface-2"}`}>
            <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted">{m.label}</dt>
            <dd
              className={`font-display text-2xl font-semibold tabular-nums ${m.key === "protein" ? "text-accent" : ""}`}
            >
              {fmt(shown[m.key], m.unit)}
              <span className="ml-0.5 text-sm font-medium text-muted">{m.unit === "kcal" ? "" : "g"}</span>
            </dd>
          </div>
        ))}
      </dl>

      <table className="mt-4 w-full text-[0.9375rem]">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted">
            <th className="pb-1 font-medium">Micros</th>
            <th className="pb-1 text-right font-medium">Amount</th>
            {view === "serving" && <th className="pb-1 text-right font-medium">Daily %</th>}
          </tr>
        </thead>
        <tbody>
          {MICROS.map((m) => (
            <tr key={m.key} className="border-t border-line">
              <td className="py-1.5">{m.label}</td>
              <td className="py-1.5 text-right tabular-nums">
                {fmt(shown[m.key], m.unit, m.key)}
                {m.unit}
              </td>
              {view === "serving" && (
                <td className="py-1.5 text-right tabular-nums text-muted">
                  {Math.round((shown[m.key] / m.ri) * 100)}%
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        Rough estimate from typical values for raw ingredients, so check your own labels. It counts about a third of
        a flour coating and a fifth of a brine or marinade as eaten, and leaves out optional extras and anything
        &ldquo;to taste&rdquo;. Daily % is of UK adult reference intakes.
        {unmatched.length > 0 && <> Not counted: {unmatched.join(", ")}.</>}
      </p>
    </section>
  );
}
