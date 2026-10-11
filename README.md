# Chicken Prep

Chicken meal-prep recipes and homemade seasoning blends that scale to however much chicken you bought. Enter the grams and every ingredient adjusts, including the number of wraps. Everything is cooked in the air fryer. Add several recipes to the shopping list and their ingredients are combined into one list, grouped by aisle.

All the content lives in [`chicken-meal-prep-recipes.md`](chicken-meal-prep-recipes.md). The website reads that file when it builds, so you edit recipes there.

## Run it

Needs [Bun](https://bun.sh).

```sh
bun install
bun run dev        # http://localhost:3000
```

| Command | What it does |
|---|---|
| `bun run dev` | Dev server |
| `bun run build` | Build the static site into `out/` |
| `bun run start` | Serve `out/` locally |
| `bun run preview` | Build, then serve |
| `bun run check` | Lint and type-check |
| `bun run clean` | Delete `.next/` and `out/` |

`out/` is plain HTML, so you can host it anywhere static (GitHub Pages, Netlify, Cloudflare Pages).

## Adding or editing a recipe

Keep the same layout as the existing recipes:

```md
## 8. Recipe name
*One-line description.*

**Air fryer:** 200°C · 12–15 min · shake halfway

### Chicken
- 900g chicken breast, diced
- 1 tsp smoked paprika

### Method
1. ...
```

- The first `NNNg ... chicken` line sets the weight the recipe is written for. The build fails if it's missing.
- Amounts must come first on the line (`1½ tsp`, `2–3 tbsp`, `6 pitta breads`). Lines like `Salt, to taste` are never scaled.
- Pitta, tortilla and lavash are always rounded up to whole breads.

## Project layout

- `app/`: pages (home, `/recipes/[slug]`, `/seasonings`, `/list`)
- `components/`: UI, including the grams control
- `lib/parse.ts`: reads the Markdown file into recipes and blends
- `lib/quantity.ts` and `lib/scale.ts`: parse amounts, then scale and round them
- `lib/shopping.ts`: combines several scaled recipes into one shopping list
- `scripts/serve.ts`: small Bun server for `out/`
