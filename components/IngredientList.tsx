"use client";

import type { ScaledIngredient } from "@/lib/scale";

type Props = {
  groups: { title: string; items: ScaledIngredient[] }[];
  checked: Set<string>;
  onToggle: (id: string) => void;
};

export function IngredientList({ groups, checked, onToggle }: Props) {
  return (
    <div className="space-y-6">
      {groups.map((g, gi) => (
        <section key={g.title + gi}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-accent">{g.title}</h3>
          <ul className="divide-y divide-line/70">
            {g.items.map((item, ii) => {
              const id = `${gi}-${ii}`;
              const done = checked.has(id);
              return (
                <li key={id}>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-[15px] leading-snug">
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => onToggle(id)}
                      className="mt-0.5 size-[18px] shrink-0 cursor-pointer rounded accent-[var(--accent)]"
                    />
                    <span className={`transition ${done ? "text-muted line-through decoration-line" : ""}`}>
                      {item.amount && (
                        <span
                          key={item.amount}
                          className={`flash -mx-1 mr-0.5 rounded px-1 font-semibold tabular-nums ${done ? "" : "text-ink"}`}
                        >
                          {item.amount}
                        </span>
                      )}{" "}
                      {item.text}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
