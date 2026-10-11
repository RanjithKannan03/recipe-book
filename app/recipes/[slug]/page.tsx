import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCookbook } from "@/lib/parse";
import { RecipeScaler } from "@/components/RecipeScaler";
import { CookPanel } from "@/components/ui";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return getCookbook().recipes.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const recipe = getCookbook().recipes.find((r) => r.slug === slug);
  return { title: recipe?.title ?? "Recipe" };
}

export default async function RecipePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const { recipes } = getCookbook();
  const index = recipes.findIndex((r) => r.slug === slug);
  if (index === -1) notFound();
  const recipe = recipes[index];
  const prev = recipes[index - 1];
  const next = recipes[index + 1];

  return (
    <main className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
      <Link href="/#recipes" className="inline-flex h-9 items-center gap-1 text-sm text-muted hover:text-ink">
        ← All recipes
      </Link>

      <header className="mt-3 mb-5 max-w-3xl sm:mb-6">
        <p className="font-display text-sm font-semibold tracking-wide text-accent">
          Recipe {String(recipe.number).padStart(2, "0")}
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold leading-[1.1] tracking-tight text-balance sm:text-5xl">
          {recipe.title}
        </h1>
        {recipe.tagline && <p className="mt-3 text-lg text-muted">{recipe.tagline}</p>}
        {recipe.airFryer && (
          <div className="mt-5">
            <CookPanel air={recipe.airFryer} />
          </div>
        )}
      </header>

      <RecipeScaler recipe={recipe} />

      <nav className="mt-14 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/recipes/${prev.slug}`}
            className="rounded-2xl border border-line bg-surface p-4 transition hover:border-accent"
          >
            <span className="text-xs text-muted">← Previous</span>
            <span className="mt-1 block font-display font-semibold">{prev.title}</span>
          </Link>
        ) : (
          <span className="hidden sm:block" />
        )}
        {next && (
          <Link
            href={`/recipes/${next.slug}`}
            className="rounded-2xl border border-line bg-surface p-4 text-right transition hover:border-accent"
          >
            <span className="text-xs text-muted">Next →</span>
            <span className="mt-1 block font-display font-semibold">{next.title}</span>
          </Link>
        )}
      </nav>
    </main>
  );
}
