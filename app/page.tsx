import Link from "next/link";
import { getCookbook } from "@/lib/parse";
import { CookPill } from "@/components/ui";
import { CardAddButton } from "@/components/CardAddButton";

export default function Home() {
  const { recipes, blends } = getCookbook();

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="pt-10 pb-10 sm:pt-16 sm:pb-14">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">Meal prep, sorted</p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-6xl">
          Chicken recipes that scale to what you bought.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          Enter the grams of chicken on any recipe and every ingredient (spices, sauces, even the number of wraps)
          adjusts to match.
        </p>
      </section>

      <Link
        href="/seasonings"
        className="group relative block overflow-hidden rounded-3xl bg-accent p-6 text-accent-ink shadow-card transition hover:-translate-y-0.5 sm:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-white/10 sm:size-64"
        />
        <p className="text-sm font-semibold uppercase tracking-[0.14em] opacity-80">Part 1</p>
        <h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Homemade seasoning blends</h2>
        <p className="mt-2 max-w-xl opacity-90">
          {blends.length} spice mixes. Tell it how much chicken you have and get exact spoon amounts.
        </p>
        <div className="mt-5 flex flex-wrap gap-1.5">
          {blends.map((b) => (
            <span key={b.slug} className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">
              {b.name}
            </span>
          ))}
        </div>
        <span className="mt-6 inline-flex items-center gap-1 font-semibold">
          Open blends <span className="transition group-hover:translate-x-1">→</span>
        </span>
      </Link>

      <section id="recipes" className="scroll-mt-6 pt-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">Part 2</p>
            <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight">Recipes</h2>
          </div>
          <p className="text-sm text-muted">{recipes.length} recipes</p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => (
            <li key={r.slug} className="relative">
              <Link
                href={`/recipes/${r.slug}`}
                className="group flex h-full flex-col rounded-3xl border border-line bg-surface p-5 shadow-card transition hover:border-accent sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-display text-4xl font-semibold leading-none text-accent/90 tabular-nums">
                    {String(r.number).padStart(2, "0")}
                  </span>
                  <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted tabular-nums">
                    Written for {r.baseGrams}g
                  </span>
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold leading-snug text-balance">{r.title}</h3>
                <p className="mt-1.5 text-sm text-muted">
                  {r.tagline ?? r.groups.map((g) => g.title).filter((t) => !/^chicken$/i.test(t)).join(" · ")}
                </p>
                <div className="mt-auto flex min-h-11 items-center pt-5 pr-24">
                  {r.airFryer && <CookPill air={r.airFryer} />}
                </div>
              </Link>
              {/* Outside the link so it doesn't navigate; sits over the card's bottom-right corner */}
              <div className="absolute right-5 bottom-5 sm:right-6 sm:bottom-6">
                <CardAddButton slug={r.slug} baseGrams={r.baseGrams} title={r.title} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
