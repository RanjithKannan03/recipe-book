import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";
import { getCookbook } from "@/lib/parse";
import { Inline } from "@/components/Inline";
import { ListNavLink } from "@/components/ListNavLink";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz", "SOFT"] });

export const metadata: Metadata = {
  title: { default: "Chicken Prep", template: "%s · Chicken Prep" },
  description: "Chicken meal-prep recipes and seasoning blends that scale to however much chicken you bought.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6ef" },
    { media: "(prefers-color-scheme: dark)", color: "#161210" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { footnotes } = getCookbook();
  return (
    <html lang="en-GB">
      <body className={`${inter.variable} ${fraunces.variable} font-sans antialiased`}>
        <header className="border-b border-line/70">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
            <Link href="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap font-display text-lg font-semibold tracking-tight">
              <span aria-hidden className="grid size-8 place-items-center rounded-full bg-accent text-accent-ink">
                🍗
              </span>
              <span className="max-[359px]:sr-only">Chicken Prep</span>
            </Link>
            <div className="flex items-center gap-0.5 text-sm font-medium sm:gap-1">
              <Link
                href="/#recipes"
                className="hidden rounded-full px-3 py-2 text-muted hover:bg-surface-2 hover:text-ink sm:block"
              >
                Recipes
              </Link>
              <Link href="/seasonings" className="rounded-full px-2.5 py-2 sm:px-3 text-muted hover:bg-surface-2 hover:text-ink">
                Seasonings
              </Link>
              <ListNavLink />
            </div>
          </nav>
        </header>
        {children}
        <footer className="mt-16 border-t border-line/70">
          <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted sm:px-6">
            {footnotes.map((f) => (
              <p key={f}>
                <Inline text={f} />
              </p>
            ))}
            <p className="mt-2">Chicken is cooked when it reaches 75°C in the thickest part.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
