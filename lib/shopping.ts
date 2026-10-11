// Combines the scaled ingredients of several recipes into one shopping list, grouped by aisle.

import type { Recipe } from "./parse";
import type { Ingredient } from "./quantity";
import { roundCount, scaleIngredient } from "./scale";

export type ShoppingEntry = { recipe: Recipe; grams: number };

export type ShoppingLine = {
  key: string;
  amount: string;
  name: string;
  optional: boolean;
  /** Recipe numbers that use this ingredient. */
  recipes: number[];
};

export type ShoppingSection = { aisle: string; lines: ShoppingLine[] };

export type ShoppingList = {
  sections: ShoppingSection[];
  /** Unmeasured lines such as "Salt, to taste" or "Squeeze of lemon juice". */
  extras: ShoppingLine[];
};

const TSP_PER = { tsp: 1, tbsp: 3, cup: 48 } as const;

type Family = "volume" | "g" | "ml" | "count" | "bread";

type Total = { min: number; max: number };

type Acc = {
  key: string;
  name: string;
  chicken: boolean;
  optional: boolean;
  recipes: Set<number>;
  totals: Map<Family, Total>;
  /** Biggest spoon unit seen, so 2 cups + 1 cup stays in cups. */
  spoon: "tsp" | "tbsp" | "cup";
};

/** Display name: the part before the first comma, without parentheticals like "(e.g. Frank's)". */
function cleanName(rest: string): string {
  return rest
    .split(",")[0]
    .replace(/\s*\([^)]*\)/g, "")
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
    /powder|paprika|cumin|ground|turmeric|black pepper|white pepper|cayenne|oregano|dill|sumac|chilli flake|dried|thyme|salt|garam|allspice|five spice|cinnamon|nutmeg/,
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

export function buildShoppingList(entries: ShoppingEntry[]): ShoppingList {
  const items = new Map<string, Acc>();
  const extras = new Map<string, ShoppingLine>();

  for (const { recipe, grams } of entries) {
    const factor = grams / recipe.baseGrams;
    for (const group of recipe.groups) {
      const groupOptional = /optional/i.test(group.title);
      for (const ing of group.items) {
        if (ing.kind === "text") {
          const name = cleanName(ing.text);
          // "Pinch of salt" / "Squeeze of lemon juice" match "salt" / "lemon juice" if those are measured elsewhere
          const key = nameKey(name.replace(/^(pinch of|squeeze of|chopped|extra)\s+/i, ""));
          const line = extras.get(key) ?? { key, amount: "", name, optional: false, recipes: [] };
          if (!line.recipes.includes(recipe.number)) line.recipes.push(recipe.number);
          extras.set(key, line);
          continue;
        }

        const name = cleanName(ing.rest);
        const key = nameKey(name);
        const optional = groupOptional || /\(optional\)/i.test(ing.rest);
        let acc = items.get(key);
        if (!acc) {
          acc = { key, name, chicken: ing.kind === "chicken", optional, recipes: new Set(), totals: new Map(), spoon: "tsp" };
          items.set(key, acc);
        }
        acc.optional &&= optional;
        acc.recipes.add(recipe.number);

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
      recipes: [...acc.recipes].sort((a, b) => a - b),
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
