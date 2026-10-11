"use client";

import { useId, useState } from "react";

const MIN = 50;
const MAX = 10000;
const STEP = 50;

type Props = {
  value: number;
  onChange: (grams: number) => void;
  presets: number[];
  label?: string;
  /** Shown as a badge next to the input, e.g. "×1.5". */
  badge?: string;
  /** Smaller layout for the sticky mobile bar. */
  compact?: boolean;
};

export function GramsControl({ value, onChange, presets, label = "Chicken you bought", badge, compact }: Props) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (n: number) => onChange(Math.min(MAX, Math.max(MIN, Math.round(n))));

  const stepBtn =
    "grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-xl font-medium text-ink transition hover:border-accent hover:text-accent active:scale-95 disabled:opacity-40";

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className={`font-medium ${compact ? "text-xs uppercase tracking-wide text-muted" : "text-sm"}`}
        >
          {label}
        </label>
        {badge && (
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent tabular-nums">
            {badge}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className={stepBtn}
          aria-label={`Remove ${STEP} grams`}
          disabled={value <= MIN}
          onClick={() => commit(value - STEP)}
        >
          −
        </button>
        <div className="relative min-w-0 flex-1">
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={MIN}
            max={MAX}
            step={STEP}
            value={draft ?? String(value)}
            onChange={(e) => {
              setDraft(e.target.value);
              const n = Number(e.target.value);
              if (e.target.value && Number.isFinite(n) && n >= MIN && n <= MAX) onChange(Math.round(n));
            }}
            onBlur={() => {
              if (draft !== null && Number.isFinite(Number(draft)) && draft !== "") commit(Number(draft));
              setDraft(null);
            }}
            className={`h-11 w-full rounded-full border border-line bg-surface pl-4 pr-10 text-center font-display font-semibold tabular-nums text-ink outline-none transition focus:border-accent ${
              compact ? "text-lg" : "text-xl"
            }`}
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">g</span>
        </div>
        <button
          type="button"
          className={stepBtn}
          aria-label={`Add ${STEP} grams`}
          disabled={value >= MAX}
          onClick={() => commit(value + STEP)}
        >
          +
        </button>
      </div>

      {presets.length > 0 && (
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setDraft(null);
                onChange(p);
              }}
              aria-pressed={p === value}
              className={`h-9 shrink-0 rounded-full px-3.5 text-sm font-medium tabular-nums transition ${
                p === value
                  ? "bg-accent text-accent-ink"
                  : "border border-line bg-surface text-muted hover:border-accent hover:text-ink"
              }`}
            >
              {p >= 1000 ? `${p / 1000}kg` : `${p}g`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
