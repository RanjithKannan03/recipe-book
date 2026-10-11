// Parses the leading quantity of an ingredient line from the recipes Markdown,
// e.g. "1½ tsp salt", "2–3 tbsp buttermilk", "900g (2 lb) chicken breast", "6 thin pitta breads".

export type Unit = "g" | "kg" | "ml" | "lb" | "tsp" | "tbsp" | "cup";

export type Ingredient =
  | { kind: "text"; text: string }
  | {
      // measure: has a unit; count: a plain number of things; bread: wraps/pitta (always whole);
      // chicken: the main chicken line that sets the recipe's base weight
      kind: "measure" | "count" | "bread" | "chicken";
      min: number;
      max?: number;
      unit: Unit | null;
      rest: string;
      /** Words before the number that should be kept, e.g. "About " */
      prefix?: string;
    };

const FRACTIONS: Record<string, number> = {
  "½": 1 / 2,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 1 / 4,
  "¾": 3 / 4,
  "⅛": 1 / 8,
};

const NUM = String.raw`(?:\d+(?:\.\d+)?[½⅓⅔¼¾⅛]?|[½⅓⅔¼¾⅛])`;
const LEADING = new RegExp(
  String.raw`^(about\s+)?(${NUM})(?:\s*[–-]\s*(${NUM}))?\s*(g|kg|ml|lb|tsp|tbsp|cups?)?\b\s*(.*)$`,
  "i",
);

export function parseNumber(token: string): number {
  const m = token.match(/^(\d+(?:\.\d+)?)?([½⅓⅔¼¾⅛])?$/);
  if (!m) return NaN;
  return (m[1] ? parseFloat(m[1]) : 0) + (m[2] ? FRACTIONS[m[2]] : 0);
}

const BREAD = /\b(pitta|tortilla|lavash)\b/i;

export function parseIngredient(line: string): Ingredient {
  const m = line.match(LEADING);
  if (!m) return { kind: "text", text: line };

  const [, prefix, a, b, rawUnit, rest] = m;
  const unit = rawUnit ? ((rawUnit.startsWith("cup") ? "cup" : rawUnit) as Unit) : null;
  const min = parseNumber(a);
  const max = b ? parseNumber(b) : undefined;

  if (unit === "g" && /chicken/i.test(rest) && !/sauce|dip/i.test(rest)) {
    // Drop imperial conversions like "(2 lb)"; the page shows the chosen grams instead.
    return { kind: "chicken", min, max, unit, rest: rest.replace(/^\([^)]*lb\)\s*/, "") };
  }
  if (unit) return { kind: "measure", min, max, unit, rest, prefix };
  return { kind: BREAD.test(rest) ? "bread" : "count", min, max, unit: null, rest, prefix };
}

const TSP_PER: Partial<Record<Unit, number>> = { tsp: 1, tbsp: 3, cup: 48 };

/** Volume of a spoon/cup measure in teaspoons (midpoint of a range), or 0 for anything else. */
export function toTsp(ing: Ingredient): number {
  if (ing.kind !== "measure" || !ing.unit || !TSP_PER[ing.unit]) return 0;
  const qty = ing.max !== undefined ? (ing.min + ing.max) / 2 : ing.min;
  return qty * TSP_PER[ing.unit]!;
}
