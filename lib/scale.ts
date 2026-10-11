// Scales parsed ingredients by a factor and formats them the way a cook would write them:
// kitchen fractions for spoons/cups, round grams, whole breads, and singular/plural nouns.

import { parseNumber, type Ingredient, type Unit } from "./quantity";

export type ScaledIngredient = {
  /** The amount, e.g. "1½ tbsp" or "3"; empty when the line has no quantity. */
  amount: string;
  /** The rest of the line, e.g. "smoked paprika". */
  text: string;
  scaled: boolean;
};

const GLYPHS: [number, string][] = [
  [1 / 8, "⅛"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [1 / 2, "½"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
];

/** Rounds x to the nearest of the allowed fractional parts and renders it, e.g. 1.5 → "1½". */
function kitchen(x: number, parts: number[]): string {
  let whole = Math.floor(x);
  const frac = x - whole;
  let best = 0;
  for (const p of [0, ...parts, 1]) if (Math.abs(frac - p) < Math.abs(frac - best)) best = p;
  if (best === 1) {
    whole += 1;
    best = 0;
  }
  const glyph = best ? GLYPHS.find(([v]) => Math.abs(v - best) < 1e-6)![1] : "";
  if (!whole && !glyph) return "";
  return `${whole || ""}${glyph}`;
}

const QUARTERS = [0.25, 0.5, 0.75];
const HALVES = [0.5];
const SMALL = [0.125, 0.25, 0.5, 0.75];
const CUPS = [0.25, 1 / 3, 0.5, 2 / 3, 0.75];

const TSP_PER: Record<"tsp" | "tbsp" | "cup", number> = { tsp: 1, tbsp: 3, cup: 48 };

/** Picks the most readable spoon/cup unit for a volume given in teaspoons. */
function spoonUnit(tsp: number, original: "tsp" | "tbsp" | "cup"): "tsp" | "tbsp" | "cup" {
  if (original === "cup") return tsp >= 12 ? "cup" : tsp >= 3 ? "tbsp" : "tsp";
  if (original === "tbsp") return tsp >= 24 ? "cup" : tsp >= 3 ? "tbsp" : "tsp";
  return tsp >= 24 ? "cup" : tsp >= 3 ? "tbsp" : "tsp";
}

function formatSpoon(tsp: number, unit: "tsp" | "tbsp" | "cup"): string {
  const v = tsp / TSP_PER[unit];
  // Cup fractions have big gaps (⅓ → ½); if the nearest one is more than 8% off, use tablespoons instead.
  if (unit === "cup" && v < 2) {
    const shown = parseNumber(kitchen(v, CUPS));
    if (Math.abs(shown - v) / v > 0.08) return formatSpoon(tsp, "tbsp");
  }
  const parts = unit === "cup" ? CUPS : v >= 2 && unit === "tbsp" ? HALVES : v < 1 ? SMALL : QUARTERS;
  const n = kitchen(v, parts) || "⅛";
  const label = unit === "cup" ? (/^\d/.test(n) && n !== "1" ? "cups" : "cup") : unit;
  return `${n} ${label}`;
}

function formatWeight(v: number, unit: Unit): string {
  if (unit === "lb") return `${Math.round(v * 10) / 10} lb`;
  if (unit === "kg") return `${Math.round(v * 100) / 100} kg`;
  const r = v < 10 ? Math.max(1, Math.round(v)) : Math.round(v / 5) * 5;
  return `${r}${unit}`;
}

type CountRule = { noun: RegExp; one: string; many: string; round: (x: number) => number };

const whole = (x: number) => Math.max(1, Math.round(x));
const half = (x: number) => Math.max(0.5, Math.round(x * 2) / 2);

const COUNT_RULES: CountRule[] = [
  { noun: /\beggs?\b/, one: "egg", many: "eggs", round: whole },
  { noun: /\bcloves?\b/, one: "clove", many: "cloves", round: whole },
  { noun: /\bsprays?\b/, one: "spray", many: "sprays", round: whole },
  { noun: /\bonions?\b/, one: "onion", many: "onions", round: half },
  { noun: /\bbreads?\b/, one: "bread", many: "breads", round: whole },
  { noun: /\bwraps?\b/, one: "wrap", many: "wraps", round: whole },
];

function formatCount(x: number, rest: string, bread: boolean): { amount: string; text: string; value: number } {
  const rule = COUNT_RULES.find((r) => r.noun.test(rest));
  // Breads are always rounded up so there is enough to wrap all the chicken.
  const value = bread ? Math.max(1, Math.ceil(x - 0.05)) : (rule?.round ?? half)(x);
  const text = rule ? rest.replace(rule.noun, value > 1 ? rule.many : rule.one) : rest;
  return { amount: kitchen(value, [0.5]), text, value };
}

/** Scales amounts inside an alternative like "(or 1 tbsp tomato purée + 1 tsp chilli flakes)". */
function scaleAlternative(rest: string, factor: number): string {
  return rest.replace(/\(or [^)]*\)/, (alt) =>
    alt.replace(/(\d+[½⅓⅔¼¾⅛]?|[½⅓⅔¼¾⅛]) (tsp|tbsp)\b/g, (_, n: string, u: "tsp" | "tbsp") => {
      const tsp = parseNumber(n) * TSP_PER[u] * factor;
      return formatSpoon(tsp, spoonUnit(tsp, u));
    }),
  );
}

export function scaleIngredient(ing: Ingredient, factor: number, chickenGrams?: number): ScaledIngredient {
  if (ing.kind === "text") return { amount: "", text: ing.text, scaled: false };

  const prefix = ing.prefix ?? "";

  if (ing.kind === "chicken") {
    const grams = chickenGrams ?? Math.round(ing.min * factor);
    // "(about 6)" tenders → scale the count too
    const text = ing.rest.replace(/\(about (\d+)\)/, (_, n) => `(about ${Math.max(1, Math.round(Number(n) * factor))})`);
    return { amount: `${grams}g`, text, scaled: true };
  }

  if (ing.kind === "count" || ing.kind === "bread") {
    const lo = formatCount(ing.min * factor, ing.rest, ing.kind === "bread");
    if (ing.max === undefined) return { amount: prefix + lo.amount, text: lo.text, scaled: true };
    const hi = formatCount(ing.max * factor, ing.rest, ing.kind === "bread");
    const amount = lo.amount === hi.amount ? lo.amount : `${lo.amount}–${hi.amount}`;
    return { amount: prefix + amount, text: hi.text, scaled: true };
  }

  const unit = ing.unit!;
  if (unit === "tsp" || unit === "tbsp" || unit === "cup") {
    const lo = ing.min * TSP_PER[unit] * factor;
    const display = spoonUnit(lo, unit);
    const loStr = formatSpoon(lo, display);
    // "(1 = mild, 2 = hot)" refers to the original amounts; make it relative once scaled.
    const text = scaleAlternative(ing.rest, factor).replace(
      /\(\s*\S+ = mild, \S+ = hot\)/,
      factor === 1 ? "$&" : "(less = mild, more = hot)",
    );
    if (ing.max === undefined) return { amount: prefix + loStr, text, scaled: true };
    const hiStr = formatSpoon(ing.max * TSP_PER[unit] * factor, display);
    const [loN] = loStr.split(" ");
    const amount = loStr === hiStr ? loStr : `${loN}–${hiStr}`;
    return { amount: prefix + amount, text, scaled: true };
  }

  const loStr = formatWeight(ing.min * factor, unit);
  if (ing.max === undefined) return { amount: prefix + loStr, text: ing.rest, scaled: true };
  const hiStr = formatWeight(ing.max * factor, unit);
  return { amount: prefix + (loStr === hiStr ? loStr : `${loStr.replace(unit, "")}–${hiStr}`), text: ing.rest, scaled: true };
}

/** "×1.5", or "Original" when the factor is ~1. */
export function formatFactor(factor: number): string {
  if (Math.abs(factor - 1) < 0.005) return "Original";
  return `×${Number(factor.toFixed(2))}`;
}
