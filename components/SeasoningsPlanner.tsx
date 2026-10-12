"use client";

import type { Blend, BlendGuide } from "@/lib/parse";
import { blendAmounts, blendFactor, scaleIngredient, scaleWet } from "@/lib/scale";
import { BlendAddButton } from "./BlendAddButton";
import { GramsControl } from "./GramsControl";
import { Inline } from "./Inline";
import { useStoredState } from "./useStoredState";

const PRESETS = [300, 500, 600, 750, 900, 1000, 1200, 1500, 2000];

/** Formats a number of tablespoons using the same kitchen rounding as the recipes. */
function spoons(tbsp: number): string {
  return scaleIngredient({ kind: "measure", min: tbsp, unit: "tbsp", rest: "" }, 1).amount;
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full border border-line bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`h-10 flex-1 rounded-full px-3 text-sm font-medium transition ${
            o.value === value ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SeasoningsPlanner({ guide, blends }: { guide: BlendGuide; blends: Blend[] }) {
  const [grams, setGrams] = useStoredState("grams:seasonings", guide.usage[0].grams);
  const [cut, setCut] = useStoredState("cut:seasonings", 0);
  const [jar, setJar] = useStoredState("jar:seasonings", false);

  const usage = guide.usage[cut] ?? guide.usage[0];
  const { blendTbsp, oilTbsp } = blendAmounts(usage, grams);
  const cookTime = guide.cookTimes[cut];
  const cutWord = /thigh/i.test(usage.label) ? /thigh/i : /breast/i;
  const defaultTemp = cookTime?.text.match(/\d+°C/)?.[0];
  const otherTemps = blends.filter((b) => b.airFryer && defaultTemp && b.airFryer.temp !== defaultTemp);

  return (
    <>
      <section className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-5 rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
          <Segmented
            label="Cut of chicken"
            options={guide.usage.map((u, i) => ({ value: i, label: u.label.replace(/^chicken /, "") }))}
            value={cut}
            onChange={setCut}
          />
          <GramsControl value={grams} onChange={setGrams} presets={PRESETS} />
          <Segmented
            label="How much blend to mix"
            options={[
              { value: "cook", label: "Just for this cook" },
              { value: "jar", label: "Month jar (×4)" },
            ]}
            value={jar ? "jar" : "cook"}
            onChange={(v) => setJar(v === "jar")}
          />
        </div>

        <div className="flex flex-col justify-between gap-5 rounded-3xl bg-ink p-5 text-bg shadow-card sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70">For {grams}g {usage.label}</p>
            <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <p key={blendTbsp} className="flash rounded font-display text-4xl font-semibold tabular-nums">
                  {spoons(blendTbsp)}
                </p>
                <p className="text-sm opacity-70">of any blend</p>
              </div>
              <div>
                <p key={oilTbsp} className="flash rounded font-display text-4xl font-semibold tabular-nums">
                  {spoons(oilTbsp)}
                </p>
                <p className="text-sm opacity-70">of oil</p>
              </div>
            </div>
          </div>
          {cookTime && (
            <p className="border-t border-bg/15 pt-4 text-sm">
              <span className="font-semibold">{cookTime.label}:</span> air fry at {cookTime.text}, shaking halfway.
              Done at 75°C.
              {otherTemps.length > 0 && (
                <span className="mt-1 block opacity-70">
                  {otherTemps.map((b) => b.name).join(" and ")}: {otherTemps[0].airFryer!.temp} (sugar can burn). See
                  the blend cards.
                </span>
              )}
            </p>
          )}
        </div>
      </section>

      <details className="group mt-4 rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-semibold">
          How to use the blends
          <span aria-hidden className="text-accent transition group-open:rotate-45">
            +
          </span>
        </summary>
        <div className="mt-4 grid gap-6 text-[0.9375rem] leading-relaxed md:grid-cols-2">
          <ol className="space-y-3">
            {guide.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                  {i + 1}
                </span>
                <div className="pt-0.5">
                  <Inline text={s.text} />
                  {s.sub.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-muted marker:text-line">
                      {s.sub.map((t) => (
                        <li key={t}>
                          <Inline text={t} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-accent">Tips</p>
            <ul className="space-y-2">
              {guide.tips.map((t) => (
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
          </div>
        </div>
      </details>

      <ul className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {blends.map((b) => {
          const factor = blendFactor(b, blendTbsp, jar);
          const makes = spoons((b.totalTsp * factor) / 3);
          return (
            <li
              key={b.slug}
              id={b.slug}
              className="flex scroll-mt-6 flex-col rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-xl font-semibold">{b.name}</h2>
                <span key={makes} className="flash shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent tabular-nums">
                  Makes {makes}
                </span>
              </div>
              {b.note && <p className="mt-1 text-sm text-muted">{b.note}</p>}
              {b.airFryer && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs font-medium tabular-nums">
                  <span className="rounded-full bg-herb px-2.5 py-1 font-semibold text-surface">
                    ♨ {b.airFryer.temp}
                  </span>
                  {b.airFryer.details.map((d) => (
                    <span
                      key={d}
                      className={`rounded-full px-2.5 py-1 ${
                        cutWord.test(d) ? "bg-herb-soft font-semibold text-herb" : "bg-surface-2 text-muted"
                      }`}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              )}
              <ul className="mt-4 divide-y divide-line/70 text-[0.9375rem]">
                {b.items.map((item, i) => {
                  const s = scaleIngredient(item, factor);
                  return (
                    <li key={i} className="py-1.5 leading-snug">
                      {s.amount && (
                        <span key={s.amount} className="flash -mx-1 mr-0.5 rounded px-1 font-semibold tabular-nums">
                          {s.amount}
                        </span>
                      )}{" "}
                      {s.text}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-auto space-y-4 pt-4">
                {b.wet && (
                  <p className="text-sm">
                    <span className="mr-1 rounded-md bg-herb-soft px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-herb">
                      Wet{b.wetGrams ? ` · ${grams}g` : ""}
                    </span>
                    <span key={grams} className="text-muted">
                      <Inline text={scaleWet(b, grams)} />
                    </span>
                  </p>
                )}
                <BlendAddButton slug={b.slug} name={b.name} grams={grams} cut={cut} jar={jar} />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
