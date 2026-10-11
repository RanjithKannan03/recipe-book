// Reads chicken-meal-prep-recipes.md (the single source of truth, in the project root)
// and turns it into structured blends and recipes. Runs at build time only.

import fs from "node:fs";
import path from "node:path";
import { parseIngredient, parseNumber, toTsp, type Ingredient } from "./quantity";

export type Group = { title: string; items: Ingredient[] };

/** From a line like "**Air fryer:** 200°C · 12–15 min · turn halfway": temp "200°C", details ["12–15 min", "turn halfway"]. */
export type AirFryer = { temp: string; details: string[] };

function parseAirFryer(line: string): AirFryer | null {
  const m = line.match(/^\*\*Air fryer:\*\*\s*(.*)$/);
  if (!m) return null;
  const [temp, ...details] = m[1].split(/\s*·\s*/);
  return { temp: temp.trim(), details };
}

export type Recipe = {
  slug: string;
  number: number;
  title: string;
  tagline?: string;
  airFryer?: AirFryer;
  baseGrams: number;
  groups: Group[];
  steps: string[];
  notes: string[];
  callouts: string[];
};

export type Blend = {
  slug: string;
  name: string;
  note?: string;
  items: Ingredient[];
  wet?: string;
  airFryer?: AirFryer;
  /** Total volume of the blend as written, in teaspoons. */
  totalTsp: number;
};

export type Usage = { grams: number; label: string; blendTbsp: number; oilTbsp: number };

export type BlendGuide = {
  intro: string[];
  usage: Usage[];
  steps: { text: string; sub: string[] }[];
  cookTimes: { label: string; text: string }[];
  tips: string[];
};

export type Cookbook = {
  title: string;
  guide: BlendGuide;
  blends: Blend[];
  recipes: Recipe[];
  footnotes: string[];
};

export const RECIPES_FILE = path.join(process.cwd(), "chicken-meal-prep-recipes.md");

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getCookbook(): Cookbook {
  const lines = fs.readFileSync(RECIPES_FILE, "utf8").split(/\r?\n/);

  let title = "";
  let part = 0;
  const guide: BlendGuide = { intro: [], usage: [], steps: [], cookTimes: [], tips: [] };
  const blends: Blend[] = [];
  const recipes: Recipe[] = [];
  const footnotes: string[] = [];
  const sharedCallouts: { text: string; from: number; to: number }[] = [];

  let section: "guide" | "blend" | null = null;
  let inTips = false;
  let recipe: Recipe | null = null;
  let group: Group | null = null;
  let inMethod = false;

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (/^# /.test(line)) {
      if (/^# Part 1/i.test(line)) part = 1;
      else if (/^# Part 2/i.test(line)) part = 2;
      else if (!title) title = line.slice(2).trim();
      continue;
    }
    if (part === 0 || !trimmed) continue;

    if (trimmed === "---") {
      if (part === 2) recipe = null;
      continue;
    }

    if (part === 1) {
      const h2 = line.match(/^## (.+)$/);
      if (h2) {
        if (/how to use/i.test(h2[1])) section = "guide";
        else {
          section = "blend";
          blends.push({ slug: slugify(h2[1]), name: h2[1].trim(), items: [], totalTsp: 0 });
        }
        continue;
      }

      if (section === "guide") {
        const usage = line.match(/^- \*\*(\d+)g ([^*]+)\*\*:\s*about ([\d½¼¾]+) tbsp blend \+ ([\d½¼¾]+) tbsp oil/);
        const step = line.match(/^\d+\.\s+(.*)$/);
        const sub = line.match(/^\s+- (.*)$/);
        const bullet = line.match(/^- (.*)$/);
        if (usage) {
          guide.usage.push({
            grams: Number(usage[1]),
            label: usage[2].trim(),
            blendTbsp: parseNumber(usage[3]),
            oilTbsp: parseNumber(usage[4]),
          });
        } else if (trimmed === "**Tips**") {
          inTips = true;
        } else if (step) {
          guide.steps.push({ text: step[1], sub: [] });
        } else if (sub && guide.steps.length) {
          guide.steps[guide.steps.length - 1].sub.push(sub[1]);
          const time = sub[1].match(/^\*\*([^*]+):\*\*\s*(.*)$/);
          if (time) guide.cookTimes.push({ label: time[1].trim(), text: time[2] });
        } else if (bullet && inTips) {
          guide.tips.push(bullet[1]);
        } else if (!/^\*\*Method/.test(trimmed)) {
          guide.intro.push(trimmed);
        }
      } else if (section === "blend") {
        const blend = blends[blends.length - 1];
        const wet = line.match(/^\*\*Wet:\*\*\s*(.*)$/);
        const bullet = line.match(/^- (.*)$/);
        const italic = trimmed.match(/^\*([^*].*)\*$/);
        const air = parseAirFryer(trimmed);
        if (air) blend.airFryer = air;
        else if (wet) blend.wet = wet[1];
        else if (bullet) blend.items.push(parseIngredient(bullet[1]));
        else if (italic) blend.note = italic[1];
      }
      continue;
    }

    // Part 2: recipes
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      const range = quote[1].match(/recipes (\d+)[–-](\d+)/i);
      if (range) sharedCallouts.push({ text: quote[1], from: Number(range[1]), to: Number(range[2]) });
      continue;
    }

    const h2 = line.match(/^## (\d+)\.\s+(.+)$/);
    if (h2) {
      recipe = {
        slug: slugify(h2[2]),
        number: Number(h2[1]),
        title: h2[2].trim(),
        baseGrams: 0,
        groups: [],
        steps: [],
        notes: [],
        callouts: [],
      };
      recipes.push(recipe);
      group = null;
      inMethod = false;
      continue;
    }

    if (!recipe) {
      footnotes.push(trimmed);
      continue;
    }

    const h3 = line.match(/^### (.+)$/);
    if (h3) {
      inMethod = /^method$/i.test(h3[1].trim());
      group = inMethod ? null : { title: h3[1].trim(), items: [] };
      if (group) recipe.groups.push(group);
      continue;
    }

    const bullet = line.match(/^- (.*)$/);
    const step = line.match(/^\d+\.\s+(.*)$/);
    const italic = trimmed.match(/^\*([^*].*)\*$/);
    const air = parseAirFryer(trimmed);

    if (air && !recipe.airFryer) {
      recipe.airFryer = air;
    } else if (bullet && group) {
      const ing = parseIngredient(bullet[1]);
      if (ing.kind === "chicken" && !recipe.baseGrams) recipe.baseGrams = ing.min;
      group.items.push(ing);
    } else if (step && inMethod) {
      recipe.steps.push(step[1]);
    } else if (italic && !group && !inMethod && !recipe.tagline) {
      recipe.tagline = italic[1];
    } else {
      recipe.notes.push(trimmed);
    }
  }

  for (const blend of blends) blend.totalTsp = blend.items.reduce((sum, i) => sum + toTsp(i), 0);

  for (const r of recipes) {
    r.callouts = sharedCallouts.filter((c) => r.number >= c.from && r.number <= c.to).map((c) => c.text);
    if (!r.baseGrams) {
      throw new Error(`Recipe "${r.title}" has no chicken weight in grams (e.g. "- 900g chicken breast").`);
    }
  }
  if (guide.usage.length === 0) {
    throw new Error('Could not find the blend usage lines (e.g. "- **600g diced chicken breast**: about 2 tbsp blend + 1 tbsp oil").');
  }

  return { title, guide, blends, recipes, footnotes };
}
