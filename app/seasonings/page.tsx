import type { Metadata } from "next";
import { getCookbook } from "@/lib/parse";
import { SeasoningsPlanner } from "@/components/SeasoningsPlanner";
import { Inline } from "@/components/Inline";

export const metadata: Metadata = { title: "Seasoning blends" };

export default function SeasoningsPage() {
  const { guide, blends } = getCookbook();

  return (
    <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12">
      <header className="mb-6 max-w-3xl sm:mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">Part 1</p>
        <h1 className="mt-2 font-display text-3xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          Homemade seasoning blends
        </h1>
        {guide.intro.map((p) => (
          <p key={p} className="mt-3 text-lg text-muted">
            <Inline text={p.replace(/,? enough for:$/, ".")} /> Set your chicken below and each blend is sized to
            match.
          </p>
        ))}
      </header>

      <SeasoningsPlanner guide={guide} blends={blends} />
    </main>
  );
}
