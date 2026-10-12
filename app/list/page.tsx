import type { Metadata } from "next";
import { getCookbook } from "@/lib/parse";
import { ShoppingListView } from "@/components/ShoppingListView";

export const metadata: Metadata = { title: "Shopping list" };

export default function ListPage() {
  const { recipes, blends, guide } = getCookbook();

  return (
    <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12">
      <header className="mb-6 max-w-3xl sm:mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">This week</p>
        <h1 className="mt-2 font-display text-3xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          Shopping list
        </h1>
        <p className="mt-3 text-lg text-muted">
          Ingredients from every recipe and seasoning blend you add, scaled to your chicken and combined by aisle.
        </p>
      </header>

      <ShoppingListView recipes={recipes} blends={blends} usage={guide.usage} />
    </main>
  );
}
