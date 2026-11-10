# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A personal chicken meal-prep collection. `chicken-meal-prep-recipes.md` is the single source of truth; the repo root is a Next.js (App Router, TypeScript, Tailwind v4, static export) site that displays it and scales every ingredient to the grams of chicken entered.

## Commands

Use bun, not npm (lockfile is `bun.lock`).

- `bun install`
- `bun run dev`: dev server (re-reads the .md on each request)
- `bun run build`: static export to `out/`; fails if a recipe has no chicken weight in grams. Stop the dev server first, since both write to `.next/`.
- `bun run lint`, `bunx tsc --noEmit`

## How the site works

- `lib/parse.ts` reads `chicken-meal-prep-recipes.md` at build time (server only, uses `fs`) and relies on the Markdown structure below. Changing headings, the `**Wet:**` / `**Air fryer:**` lines or the blend usage bullets (`- **600g diced chicken breast**: about 2 tbsp blend + 1 tbsp oil`) requires updating the parser.
- `lib/quantity.ts` parses an ingredient's leading quantity (fractions, ranges, units). The first `NNNg ... chicken` (or `... mince`, e.g. the beef smash burger tacos) line sets a recipe's base weight; a mince recipe's page says "Mince you bought". Lines without a leading number ("Salt, to taste") are never scaled.
- `lib/scale.ts` (client-safe, no `fs`) scales by `grams / baseGrams` and does the kitchen rounding: spoon/cup unit conversion, grams to 5g, breads (pitta/tortilla/lavash) rounded up, cheese slices rounded up, other `slices` (sandwich bread) rounded up to pairs, eggs/cloves to whole numbers, onions to halves.
- Shopping list (`/list`): `components/useShoppingList.ts` keeps `{slug, grams}` entries in localStorage, shared across components and tabs. Blends are stored as `blend:<slug>` with the cut and month-jar setting; a single cook adds the spices plus chicken, oil and the Wet line's lemons/limes, a month jar only the spices. `lib/shopping.ts` scales each recipe, then merges ingredients by name (before the first comma, parentheticals dropped, singularised), sums by unit family, and groups by aisle using keyword regexes. Counts such as breads are rounded per recipe before summing.
- Nutrition (`lib/nutrition.ts`, shown by `components/NutritionCard.tsx`): estimated macros and micros from per-100g values in `FOODS` (first regex match on the ingredient name wins, so specific names go first), with densities for spoons/cups and grams per item for counts. Brines/marinades count ⅕ and flour coatings ⅓ as eaten; optional items and unmeasured lines are skipped. Shown per `Makes` serving, else per 200g of raw chicken. When adding an ingredient, add a `FOODS` row; unmatched lines are listed under the card as "Not counted".
- Seasoning blends are scaled so the blend makes the tbsp needed for the chosen chicken (the ratio comes from the usage bullets), or ×4 for a month jar.

## Document structure

- **Contents** at the top links to every section with GitHub-style heading anchors (lowercase, spaces → `-`, punctuation dropped, so `Lemon & herb` → `#lemon--herb` and `1. Hot honey…` → `#1-hot-honey-…`). When adding, renaming or renumbering a section, update the Contents link to match.
- **Part 1: Homemade Seasonings**: a shared "How to use the blends" method (quantities per 600g breast / 900g thighs, air-fry times, 75°C doneness), then one `##` section per blend. Each blend is an ingredient list sized for one week (~5 tbsp), followed by a `**Wet:**` line naming what to add at marinating time (any lemon/lime count must say what it is for, e.g. `juice of ½ lemon per 600g chicken`, so the site can scale it; the build fails otherwise) and an `**Air fryer:** 200°C · diced breast 12–15 min · thighs 18–22 min` line (sugary blends, BBQ and jerk, use 180°C). Some blends have an italic note on what they replace (e.g. a shop-bought packet).
- **Part 2: Recipes**: numbered `## N. Title` sections, each with an optional italic one-line description, an optional `**Makes:** 4 sandwiches` line (servings for the base chicken weight; the page scales it, rounded up, and shows the chicken per serving, using `(about N)` on the chicken line for a piece count), an `**Air fryer:** <temp> · <time> · <optional tip>` line (shown as tiles on the site), `###` ingredient groups (Chicken, coating, sauce, etc.), a `### Method` numbered list (amounts in braces, e.g. `stir in {1½ tsp} salt`, are scaled with the recipe and highlighted on the site), then `### Tips`, `### Rolling` (wraps) and `### Storage` bullet sections. The parser treats any `###` after Method as a tips section, never as ingredients, so it is shown as a card and kept off the shopping list.
- Sections are separated by `---`.

## Conventions

- Everything is cooked in the air fryer; the user does not deep- or pan-fry. Coated tenders are rested 10 minutes, sprayed with oil, and air fried at 200°C for 12–15 minutes, turned and sprayed halfway.

- UK English and UK ingredient names (plain flour, cornflour, chilli, flavour); metric weights and °C, with cups/tbsp/tsp for volumes and imperial in brackets only where already used (e.g. `900g (2 lb)`).
- Use Unicode fractions (½, ⅓, ¼) and en dashes for ranges (`12–15 minutes`).
- Chicken doneness is always stated as 75°C in the thickest part.
