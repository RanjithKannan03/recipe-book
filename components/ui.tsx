import type { AirFryer } from "@/lib/parse";
import { Inline } from "./Inline";

export function Callout({ text, title, icon = "💡" }: { text: string; title?: string; icon?: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-line bg-surface-2/60 p-4 text-sm leading-relaxed">
      <span aria-hidden className="text-lg leading-none">
        {icon}
      </span>
      <div>
        {title && <p className="mb-1 font-semibold">{title}</p>}
        <Inline text={text} />
      </div>
    </div>
  );
}

/** Compact "200°C · 12–15 min" pill for cards. */
export function CookPill({ air }: { air: AirFryer }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-herb-soft px-2.5 py-1 text-xs font-semibold text-herb tabular-nums">
      <span aria-hidden>♨</span>
      Air fryer · {air.temp} · {air.details[0]}
    </span>
  );
}

/** Temperature / time / tip tiles for the top of a recipe. */
export function CookPanel({ air }: { air: AirFryer }) {
  const [time, ...tips] = air.details;
  const tiles = [
    { label: "Air fryer", value: air.temp },
    { label: "Time", value: time },
    ...tips.map((t) => ({ label: "Tip", value: t.charAt(0).toUpperCase() + t.slice(1) })),
  ];
  return (
    <dl className="flex flex-wrap gap-2">
      {tiles.map((t) => (
        <div key={t.label + t.value} className="rounded-2xl border border-line bg-surface px-4 py-2.5 shadow-card">
          <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-herb">{t.label}</dt>
          <dd className="font-display text-lg font-semibold leading-tight tabular-nums">{t.value}</dd>
        </div>
      ))}
    </dl>
  );
}
