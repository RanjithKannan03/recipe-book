// Rough nutrition estimates for a scaled recipe. Client-safe (no fs).
//
// Values are typical per-100g figures (UK/USDA food tables), rounded. They are estimates: brands vary,
// and breading/marinade uptake is guessed (see RETENTION). Optional items and unmeasured lines
// ("Salt, to taste", "Shredded lettuce") are not counted.

import type { Recipe } from "./parse";
import type { Ingredient } from "./quantity";
import { roundCount } from "./scale";

export const NUTRIENTS = [
  "kcal",
  "protein",
  "fat",
  "carbs",
  "fibre",
  "sugars",
  "satFat",
  "salt",
  "potassium",
  "calcium",
  "iron",
  "vitaminC",
] as const;
export type Nutrient = (typeof NUTRIENTS)[number];
export type Nutrients = Record<Nutrient, number>;

/** Micronutrients shown in the table, with UK reference intakes for an adult (per day). */
export const MICROS: { key: Nutrient; label: string; unit: "g" | "mg"; ri: number }[] = [
  { key: "fibre", label: "Fibre", unit: "g", ri: 30 },
  { key: "sugars", label: "Sugars", unit: "g", ri: 90 },
  { key: "satFat", label: "Saturated fat", unit: "g", ri: 20 },
  { key: "salt", label: "Salt", unit: "g", ri: 6 },
  { key: "potassium", label: "Potassium", unit: "mg", ri: 2000 },
  { key: "calcium", label: "Calcium", unit: "mg", ri: 800 },
  { key: "iron", label: "Iron", unit: "mg", ri: 14 },
  { key: "vitaminC", label: "Vitamin C", unit: "mg", ri: 80 },
];

// Per 100g: kcal, protein, fat, carbs, fibre, sugars, sat fat (g), sodium, potassium, calcium, iron, vitamin C (mg)
type Row = [number, number, number, number, number, number, number, number, number, number, number, number];

type Food = {
  match: RegExp;
  per100: Row;
  /** g per ml, for tsp/tbsp/cup amounts. */
  density?: number;
  /** g per item, for counts ("1 egg", "6 thin pitta breads"); a function can look at the line. */
  each?: number | ((rest: string) => number);
};

const SPICE: Row = [320, 13, 8, 60, 25, 5, 1.5, 50, 1500, 300, 20, 2];
const OIL: Row = [884, 0, 100, 0, 0, 0, 14, 0, 0, 0, 0, 0];

// First match wins, so specific names come before general ones.
const FOODS: Food[] = [
  // Meat (from the recipe's main chicken/mince line)
  { match: /beef mince/, per100: [125, 21, 5, 0, 0, 0, 2.2, 66, 330, 10, 2.2, 0] },
  { match: /chicken mince/, per100: [130, 20, 5.5, 0, 0, 0, 1.6, 70, 300, 8, 0.8, 0] },
  { match: /breast.*thigh|thigh.*breast/, per100: [114, 21.8, 2.6, 0, 0, 0, 0.7, 68, 305, 6, 0.6, 0] },
  { match: /thigh/, per100: [121, 19.7, 4.1, 0, 0, 0, 1, 85, 240, 7, 0.8, 0] },
  { match: /chicken/, per100: [106, 24, 1.2, 0, 0, 0, 0.3, 50, 370, 5, 0.4, 0] },

  // Sauces and condiments
  { match: /garlic dip/, per100: [700, 1, 75, 3, 0, 1, 6, 700, 30, 10, 0.2, 0], density: 0.95 },
  { match: /burger sauce/, per100: [300, 1, 28, 12, 0.3, 9, 2.5, 900, 60, 10, 0.2, 1], density: 1 },
  { match: /mayonnaise|\bmayo\b/, per100: [680, 1, 75, 1, 0, 1, 6, 600, 20, 8, 0.2, 0], density: 0.95 },
  { match: /sweet chilli sauce/, per100: [220, 0.5, 0.5, 53, 1, 50, 0.1, 900, 80, 10, 0.5, 5], density: 1.25 },
  { match: /buffalo sauce/, per100: [40, 0.5, 3, 3, 0.5, 1, 0.5, 2600, 100, 10, 0.5, 2], density: 1.05 },
  { match: /hot sauce/, per100: [15, 0.5, 0.5, 2, 0.5, 1, 0, 2800, 130, 10, 0.5, 5], density: 1.05 },
  { match: /sriracha/, per100: [93, 2, 1, 19, 2, 15, 0.1, 2100, 320, 20, 1, 25], density: 1.1 },
  { match: /soy sauce/, per100: [53, 8, 0.6, 5, 0.8, 0.4, 0.1, 5500, 210, 20, 1.5, 0], density: 1.15 },
  { match: /ketchup/, per100: [100, 1.2, 0.2, 24, 0.5, 22, 0, 900, 280, 15, 0.4, 4], density: 1.15 },
  { match: /pomegranate molasses/, per100: [280, 0.5, 0, 70, 0, 60, 0, 30, 400, 20, 1, 2], density: 1.35 },
  { match: /red pepper paste/, per100: [70, 2.5, 0.5, 13, 3, 9, 0.1, 2000, 500, 20, 1.5, 20], density: 1.1 },
  { match: /tomato pur[ée]e/, per100: [82, 4.3, 0.5, 19, 4.1, 12, 0.1, 60, 1000, 36, 3, 22], density: 1.1 },
  { match: /pickle juice/, per100: [10, 0.3, 0, 2, 0, 1, 0, 1200, 30, 10, 0.2, 0], density: 1 },
  { match: /vinegar/, per100: [20, 0, 0, 0.9, 0, 0.4, 0, 5, 70, 7, 0.2, 0], density: 1 },
  { match: /lemon juice/, per100: [22, 0.4, 0.2, 6.9, 0.3, 2.5, 0, 1, 103, 6, 0.1, 39], density: 1.03 },
  { match: /honey/, per100: [304, 0.3, 0, 82, 0.2, 82, 0, 4, 52, 6, 0.4, 0.5], density: 1.42 },

  // Dairy, eggs and fats
  { match: /light spreadable butter|spread\b/, per100: [540, 0.5, 60, 0.5, 0, 0.5, 27, 600, 20, 15, 0, 0], density: 0.95 },
  { match: /unsalted butter/, per100: [717, 0.9, 81, 0.1, 0, 0.1, 51, 11, 24, 24, 0, 0], density: 0.95 },
  { match: /butter(?!milk)/, per100: [717, 0.9, 81, 0.1, 0, 0.1, 51, 600, 24, 24, 0, 0], density: 0.95 },
  { match: /buttermilk/, per100: [40, 3.3, 0.9, 4.8, 0, 4.8, 0.5, 105, 150, 116, 0.1, 1], density: 1.03 },
  { match: /0% fat greek yoghurt/, per100: [57, 10, 0.2, 3.6, 0, 3.6, 0.1, 36, 140, 110, 0.1, 0], density: 1.05 },
  { match: /greek yoghurt/, per100: [97, 9, 5, 4, 0, 4, 3.3, 36, 140, 100, 0.1, 0], density: 1.05 },
  { match: /soured cream/, per100: [198, 2.4, 19, 4.6, 0, 3.5, 12, 30, 125, 100, 0.1, 1], density: 1 },
  { match: /provolone/, per100: [351, 25.6, 26.6, 2.1, 0, 0.6, 17, 876, 138, 756, 0.5, 0], each: 17 },
  { match: /cheese slice/, per100: [330, 18, 26, 4, 0, 4, 16, 1400, 130, 600, 0.3, 0], each: 20 },
  { match: /\beggs?\b/, per100: [143, 12.6, 9.5, 0.7, 0, 0.4, 3.1, 142, 138, 56, 1.8, 0], each: 50 },
  { match: /spray/, per100: OIL, each: 0.3 },
  { match: /\boil\b|ghee/, per100: OIL, density: 0.92 },

  // Flours, coatings and breads
  { match: /pitta/, per100: [275, 9, 1.2, 55, 2.2, 2, 0.2, 535, 120, 86, 2.6, 0], each: 50 },
  { match: /tortilla/, per100: [310, 8, 7, 52, 3, 3, 3, 700, 120, 140, 3, 0], each: (r) => (/small/.test(r) ? 32 : 62) },
  { match: /lavash/, per100: [275, 9, 1.2, 55, 2.2, 2, 0.2, 535, 120, 86, 2.6, 0], each: 85 },
  { match: /\bbuns?\b/, per100: [265, 9, 4, 47, 2.5, 6, 1, 450, 120, 100, 2.5, 0], each: 60 },
  { match: /sourdough|panini|bread/, per100: [270, 10, 2, 51, 2.5, 3, 0.4, 500, 120, 50, 2, 0], each: 40 },
  { match: /cornflakes/, per100: [357, 7.5, 0.9, 84, 3, 8, 0.2, 400, 100, 5, 8, 0] },
  { match: /cornflour/, per100: [381, 0.3, 0.1, 91, 0.9, 0, 0, 9, 3, 2, 0.5, 0], density: 0.53 },
  { match: /baking powder/, per100: [53, 0, 0, 28, 0.2, 0, 0, 10600, 20, 5900, 11, 0], density: 0.92 },
  { match: /flour/, per100: [364, 10, 1, 76, 2.7, 0.3, 0.2, 2, 107, 140, 2, 0], density: 0.53 },
  { match: /chips/, per100: [160, 2.6, 5, 27, 2.5, 0.5, 0.5, 30, 400, 10, 0.8, 10], density: 0.42 },

  // Veg and herbs
  { match: /fresh parsley/, per100: [36, 3, 0.8, 6, 3.3, 0.9, 0.1, 56, 554, 138, 6.2, 133], density: 0.27 },
  { match: /pickled cucumbers|gherkins/, per100: [12, 0.5, 0.2, 2.4, 1.2, 1, 0, 800, 23, 40, 0.3, 1], density: 0.6 },
  { match: /cucumber/, per100: [15, 0.7, 0.1, 3.6, 0.5, 1.7, 0, 2, 147, 16, 0.3, 2.8], density: 0.55 },
  { match: /tomato/, per100: [18, 0.9, 0.2, 3.9, 1.2, 2.6, 0, 5, 237, 10, 0.3, 14], density: 0.75 },
  { match: /lettuce/, per100: [15, 1.4, 0.2, 2.9, 1.3, 0.8, 0, 28, 194, 36, 0.9, 9], density: 0.2 },
  { match: /garlic cloves?|fresh garlic|grated garlic/, per100: [149, 6.4, 0.5, 33, 2.1, 1, 0.1, 17, 401, 181, 1.7, 31], density: 0.57, each: 4 },

  // Spices and seasonings (dried, so "onion powder" and "garlic powder" land here, not with fresh)
  { match: /^salt\b/, per100: [0, 0, 0, 0, 0, 0, 0, 38758, 8, 24, 0.3, 0], density: 1.2 },
  {
    match: /powder|paprika|pepper|cayenne|cumin|coriander|turmeric|oregano|dill|dried parsley|sumac|chilli flakes/,
    per100: SPICE,
    density: 0.5,
  },
  { match: /red onions?|onions?/, per100: [40, 1.1, 0.1, 9.3, 1.7, 4.2, 0, 4, 146, 23, 0.2, 7.4], each: (r) => (/large/.test(r) ? 200 : 150) },
];

const ML: Record<string, number> = { tsp: 5, tbsp: 15, cup: 240 };

/**
 * Share of a group that ends up eaten: most of a brine or marinade is thrown away, and only part of a
 * flour dredge sticks to the chicken.
 */
function retention(groupTitle: string, rest: string): number {
  if (/flour|coating/i.test(groupTitle)) return 0.35;
  if (/batter/i.test(groupTitle)) return 0.4;
  if (/breading/i.test(groupTitle)) return 0.7;
  if (/marinade/i.test(groupTitle) && /buttermilk/.test(rest)) return 0.2;
  if (/chicken/i.test(groupTitle) && /buttermilk|pickle juice/.test(rest)) return 0.2;
  return 1;
}

function grams(ing: Exclude<Ingredient, { kind: "text" }>, food: Food, factor: number, rest: string): number | null {
  const qty = ing.max !== undefined ? (ing.min + ing.max) / 2 : ing.min;
  if (ing.kind === "chicken") return qty * factor;
  if (ing.unit === "g") return qty * factor;
  if (ing.unit === "kg") return qty * factor * 1000;
  if (ing.unit === "ml") return qty * factor * (food.density ?? 1);
  if (ing.unit === "lb") return qty * factor * 454;
  if (ing.unit && ML[ing.unit]) return food.density ? qty * factor * ML[ing.unit] * food.density : null;
  // Counts: use the rounded number the page shows (whole breads, half onions).
  const each = typeof food.each === "function" ? food.each(rest) : food.each;
  if (!each) return null;
  const count = roundCount(qty * factor, ing.rest, ing.kind === "bread");
  return count * each;
}

export type NutritionResult = {
  total: Nutrients;
  /** Lines that have an amount but no nutrition data, e.g. a new ingredient; shown so nothing is silently missed. */
  unmatched: string[];
};

const zero = (): Nutrients => Object.fromEntries(NUTRIENTS.map((k) => [k, 0])) as Nutrients;

export function recipeNutrition(recipe: Recipe, grams_: number): NutritionResult {
  const factor = grams_ / recipe.baseGrams;
  const total = zero();
  const unmatched: string[] = [];

  for (const group of recipe.groups) {
    if (/optional/i.test(group.title)) continue;
    for (const ing of group.items) {
      if (ing.kind === "text") continue;
      const rest = ing.rest.toLowerCase();
      if (/optional/.test(rest)) continue;
      const food = FOODS.find((f) => f.match.test(rest));
      const g = food ? grams(ing, food, factor, rest) : null;
      if (!food || g === null) {
        unmatched.push(ing.rest);
        continue;
      }
      const eaten = (g / 100) * retention(group.title, rest);
      const [kcal, protein, fat, carbs, fibre, sugars, satFat, sodium, potassium, calcium, iron, vitaminC] =
        food.per100;
      total.kcal += kcal * eaten;
      total.protein += protein * eaten;
      total.fat += fat * eaten;
      total.carbs += carbs * eaten;
      total.fibre += fibre * eaten;
      total.sugars += sugars * eaten;
      total.satFat += satFat * eaten;
      total.salt += (sodium * eaten * 2.5) / 1000;
      total.potassium += potassium * eaten;
      total.calcium += calcium * eaten;
      total.iron += iron * eaten;
      total.vitaminC += vitaminC * eaten;
    }
  }
  return { total, unmatched };
}

/** Raw chicken in one portion when a recipe has no "Makes" line: about 2 thighs or 2–3 tenderloins. */
export const PORTION_GRAMS = 200;

/** How many servings to divide by, and what one serving is called. */
export function servingSplit(grams_: number, makesCount?: number, makesLabel?: string) {
  if (makesCount && makesLabel) return { count: makesCount, label: `per ${makesLabel}` };
  return { count: grams_ / PORTION_GRAMS, label: `per ${PORTION_GRAMS}g of chicken (about 2 thighs or 2–3 tenderloins)` };
}

export function divide(n: Nutrients, by: number): Nutrients {
  return Object.fromEntries(NUTRIENTS.map((k) => [k, n[k] / by])) as Nutrients;
}
