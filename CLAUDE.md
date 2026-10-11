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
- `lib/quantity.ts` parses an ingredient's leading quantity (fractions, ranges, units). The first `NNNg ... chicken` line sets a recipe's base weight. Lines without a leading number ("Salt, to taste") are never scaled.
- `lib/scale.ts` (client-safe, no `fs`) scales by `grams / baseGrams` and does the kitchen rounding: spoon/cup unit conversion, grams to 5g, breads (pitta/tortilla/lavash) rounded up, eggs/cloves to whole numbers, onions to halves.
- Seasoning blends are scaled so the blend makes the tbsp needed for the chosen chicken (the ratio comes from the usage bullets), or ×4 for a month jar.

## Document structure

- **Contents** at the top links to every section with GitHub-style heading anchors (lowercase, spaces → `-`, punctuation dropped, so `Lemon & herb` → `#lemon--herb` and `1. Hot honey…` → `#1-hot-honey-…`). When adding, renaming or renumbering a section, update the Contents link to match.
- **Part 1: Homemade Seasonings**: a shared "How to use the blends" method (quantities per 600g breast / 900g thighs, air-fry times, 75°C doneness), then one `##` section per blend. Each blend is an ingredient list sized for one week (~5 tbsp), followed by a `**Wet:**` line naming what to add at marinating time and an `**Air fryer:** 200°C · diced breast 12–15 min · thighs 18–22 min` line (sugary blends, BBQ and jerk, use 180°C). Some blends have an italic note on what they replace (e.g. a shop-bought packet).
- **Part 2: Recipes**: numbered `## N. Title` sections, each with an optional italic one-line description, an `**Air fryer:** <temp> · <time> · <optional tip>` line (shown as tiles on the site), `###` ingredient groups (Chicken, coating, sauce, etc.), and a final `### Method` numbered list.
- Sections are separated by `---`.

## Conventions

- Everything is cooked in the air fryer; the user does not deep- or pan-fry. Coated tenders are rested 10 minutes, sprayed with oil, and air fried at 200°C for 12–15 minutes, turned and sprayed halfway.

- UK English and UK ingredient names (plain flour, cornflour, chilli, flavour); metric weights and °C, with cups/tbsp/tsp for volumes and imperial in brackets only where already used (e.g. `900g (2 lb)`).
- Use Unicode fractions (½, ⅓, ¼) and en dashes for ranges (`12–15 minutes`).
- Chicken doneness is always stated as 75°C in the thickest part.
