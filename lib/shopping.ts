// Combines the scaled ingredients of several recipes and seasoning blends into one shopping list,
// grouped by aisle.

import type { Blend, Recipe, Usage } from "./parse";
import type { Ingredient } from "./quantity";
import { blendAmounts, blendFactor, roundCount, scaleIngredient } from "./scale";

export type ShoppingEntry =
  | { recipe: Recipe; grams: number }
  | { blend: Blend; usage: Usage; grams: number; jar: boolean };

/** Where an ingredient comes from: recipe "3", or blend "Peri-peri". */
export type SourceTag = { label: string; title: string; order: number };

export type ShoppingLine = {
  key: string;
  amount: string;
  name: string;
  optional: boolean;
  sources: SourceTag[];
};

export type ShoppingSection = { aisle: string; lines: ShoppingLine[] };

export type ShoppingList = {
  sections: ShoppingSection[];
  /** Unmeasured lines such as "Salt, to taste" or "Squeeze of lemon juice". */
  extras: ShoppingLine[];
};

type SourceGroup = { title: string; items: Ingredient[]; factor: number };
type Source = { tag: SourceTag; grams: number; groups: SourceGroup[] };

/** Turns a list entry into ingredient groups, each with the factor to scale it by. */
function toSource(entry: ShoppingEntry): Source {
  if ("recipe" in entry) {
    const { recipe, grams } = entry;
    const factor = grams / recipe.baseGrams;
    return {
      tag: { label: String(recipe.number), title: `Recipe ${recipe.number}: ${recipe.title}`, order: recipe.number },
      grams,
      groups: recipe.groups.map((g) => ({ ...g, factor })),
    };
  }
  const { blend, usage, grams, jar } = entry;
  const { blendTbsp, oilTbsp } = blendAmounts(usage, grams);
  const factor = blendFactor(blend, blendTbsp, jar);
  const groups: SourceGroup[] = [{ title: blend.name, items: blend.items, factor }];
  // A month jar is just the dry blend; a single cook also needs the chicken, oil and lemons/limes.
  if (!jar) {
    groups.push(
      { title: "Chicken", items: [{ kind: "chicken", min: grams, unit: "g", rest: usage.label }], factor: 1 },
      { title: "Oil", items: [{ kind: "measure", min: oilTbsp, unit: "tbsp", rest: "oil" }], factor: 1 },
      { title: "Wet", items: blend.wetItems, factor: blend.wetGrams ? grams / blend.wetGrams : 1 },
    );
  }
  return {
    tag: { label: blend.name.split(" ")[0], title: `${blend.name} blend`, order: 1000 },
    grams: jar ? 0 : grams,
    groups,
  };
}

const TSP_PER = { tsp: 1, tbsp: 3, cup: 48 } as const;

type Family = "volume" | "g" | "ml" | "count" | "bread";

type Total = { min: number; max: number };

type Acc = {
  key: string;
  name: string;
  chicken: boolean;
  optional: boolean;
  sources: Map<string, SourceTag>;
  totals: Map<Family, Total>;
  /** Biggest spoon unit seen, so 2 cups + 1 cup stays in cups. */
  spoon: "tsp" | "tbsp" | "cup";
};

/** Display name: the part before the first comma, without parentheticals like "(e.g. Frank's)". */
function cleanName(rest: string): string {
  // Parentheticals go first, so "chilli powder (1 = mild, 2 = hot)" isn't cut at its comma.
  return rest
    .replace(/\s*\([^)]*\)/g, "")
    .split(",")[0]
    .replace(/\s+/g, " ")
    .trim();
}

/** Matching key: lowercase, size words dropped, words singularised, so "tomatoes" and "tomato" merge. */
function nameKey(name: string): string {
  return name
    .toLowerCase()
    .split(" ")
    .filter((w) => !/^(large|small|medium|thin)$/.test(w))
    .map((w) => w.replace(/oes$/, "o").replace(/([^s])s$/, "$1"))
    .join(" ");
}

const AISLES: [string, RegExp][] = [
  ["Bread & wraps", /pitta|tortilla|lavash|wrap/],
  ["Baking & dry goods", /baking powder|flour|cornflake|sugar/],
  [
    "Spices & dried herbs",
    /powder|granules|paprika|cumin|ground|turmeric|black pepper|white pepper|cayenne|oregano|dill|sumac|chilli flake|dried|thyme|salt|garam|allspice|five spice|cinnamon|nutmeg/,
  ],
  ["Dairy & eggs", /buttermilk|yoghurt|soured cream|butter|egg|ghee/],
  [
    "Sauces & condiments",
    /sauce|sriracha|mayonnaise|ketchup|honey|molasses|vinegar|soy|paste|purée|dip|pickle|gherkin/,
  ],
  ["Fruit & veg", /onion|garlic|lemon|lime|tomato|cucumber|lettuce|parsley/],
  ["Oil", /oil|spray/],
];

const AISLE_ORDER = ["Meat", ...AISLES.map(([a]) => a), "Other"];

function aisleFor(acc: Acc): string {
  if (acc.chicken) return "Meat";
  const name = acc.name.toLowerCase();
  return AISLES.find(([, re]) => re.test(name))?.[0] ?? "Other";
}

function add(map: Map<Family, Total>, family: Family, min: number, max: number) {
  const t = map.get(family) ?? { min: 0, max: 0 };
  map.set(family, { min: t.min + min, max: t.max + max });
}

function formatTotal(family: Family, t: Total, acc: Acc): { amount: string; name?: string } {
  const max = t.max - t.min > 1e-6 ? t.max : undefined;
  if (family === "volume") {
    // Totals are in tsp; let the recipe formatter pick tsp/tbsp/cups.
    const ing: Ingredient = { kind: "measure", min: t.min / TSP_PER[acc.spoon], max: max && max / TSP_PER[acc.spoon], unit: acc.spoon, rest: "" };
    return { amount: scaleIngredient(ing, 1).amount };
  }
  if (family === "g" || family === "ml") {
    if (acc.chicken) return { amount: `${Math.round(t.min)}g` };
    return { amount: scaleIngredient({ kind: "measure", min: t.min, max, unit: family, rest: "" }, 1).amount };
  }
  // Counts were rounded per recipe already; this only formats and pluralises ("3 red onions").
  const s = scaleIngredient({ kind: family, min: t.min, max, unit: null, rest: acc.name }, 1);
  return { amount: s.amount, name: s.text };
}

const byOrder = (a: SourceTag, b: SourceTag) => a.order - b.order || a.label.localeCompare(b.label);

export function buildShoppingList(entries: ShoppingEntry[]): ShoppingList {
  const items = new Map<string, Acc>();
  const extras = new Map<string, ShoppingLine>();

  for (const { tag, grams, groups } of entries.map(toSource)) {
    for (const { factor, ...group } of groups) {
      const groupOptional = /optional/i.test(group.title);
      for (const ing of group.items) {
        if (ing.kind === "text") {
          const name = cleanName(ing.text);
          // "Pinch of salt" / "Squeeze of lemon juice" match "salt" / "lemon juice" if those are measured elsewhere
          const key = nameKey(name.replace(/^(pinch of|squeeze of|chopped|extra)\s+/i, ""));
          const line = extras.get(key) ?? { key, amount: "", name, optional: false, sources: [] };
          if (!line.sources.some((t) => t.title === tag.title)) line.sources.push(tag);
          extras.set(key, line);
          continue;
        }

        const name = cleanName(ing.rest);
        const key = nameKey(name);
        const optional = groupOptional || /\(optional\)/i.test(ing.rest);
        let acc = items.get(key);
        if (!acc) {
          acc = { key, name, chicken: ing.kind === "chicken", optional, sources: new Map(), totals: new Map(), spoon: "tsp" };
          items.set(key, acc);
        }
        acc.optional &&= optional;
        acc.sources.set(tag.title, tag);

        const lo = ing.min;
        const hi = ing.max ?? ing.min;
        if (ing.kind === "chicken") {
          add(acc.totals, "g", grams, grams);
        } else if (ing.kind === "count" || ing.kind === "bread") {
          const bread = ing.kind === "bread";
          add(acc.totals, ing.kind, roundCount(lo * factor, ing.rest, bread), roundCount(hi * factor, ing.rest, bread));
        } else if (ing.unit === "tsp" || ing.unit === "tbsp" || ing.unit === "cup") {
          if (TSP_PER[ing.unit] > TSP_PER[acc.spoon]) acc.spoon = ing.unit;
          add(acc.totals, "volume", lo * TSP_PER[ing.unit] * factor, hi * TSP_PER[ing.unit] * factor);
        } else if (ing.unit === "kg") {
          add(acc.totals, "g", lo * 1000 * factor, hi * 1000 * factor);
        } else if (ing.unit === "g" || ing.unit === "ml") {
          add(acc.totals, ing.unit, lo * factor, hi * factor);
        }
      }
    }
  }

  const byAisle = new Map<string, ShoppingLine[]>();
  for (const acc of items.values()) {
    let name = acc.name;
    const amounts: string[] = [];
    for (const [family, total] of acc.totals) {
      const f = formatTotal(family, total, acc);
      amounts.push(f.amount);
      if (f.name) name = f.name;
    }
    const aisle = aisleFor(acc);
    const lines = byAisle.get(aisle) ?? [];
    lines.push({
      key: acc.key,
      amount: amounts.join(" + "),
      name,
      optional: acc.optional,
      sources: [...acc.sources.values()].sort(byOrder),
    });
    byAisle.set(aisle, lines);
  }

  const sections = AISLE_ORDER.filter((a) => byAisle.has(a)).map((aisle) => ({
    aisle,
    lines: byAisle.get(aisle)!.sort((a, b) => a.name.localeCompare(b.name)),
  }));

  // Drop extras that are already on the list with an amount (e.g. "Salt, to taste" when salt is measured too).
  const extraLines = [...extras.values()]
    .filter((e) => !items.has(e.key))
    .map((e) => ({ ...e, sources: e.sources.sort(byOrder) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { sections, extras: extraLines };
}

/** Plain-text version for pasting into a notes app. */
export function shoppingListText(list: ShoppingList): string {
  const out: string[] = [];
  for (const s of list.sections) {
    out.push(s.aisle.toUpperCase());
    for (const l of s.lines) out.push(`- ${l.amount} ${l.name}${l.optional ? " (optional)" : ""}`);
    out.push("");
  }
  if (list.extras.length) {
    out.push("ALSO CHECK YOU HAVE");
    for (const e of list.extras) out.push(`- ${e.name}`);
  }
  return out.join("\n").trim();
}
