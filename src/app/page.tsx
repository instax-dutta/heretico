import type { Metadata } from "next";
import Link from "next/link";
import { RecipeTable } from "@/components/RecipeTable";
import { Card, Stat } from "@/components/ui";
import { getSnapshot, getTopRows } from "@/lib/dataset";
import { familyHref, formatCompact, formatDate } from "@/lib/format";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const snapshot = getSnapshot();
  const top = getTopRows(10);
  const families = [...snapshot.families].sort((a, b) => b.originCount - a.originCount).slice(0, 12);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Find the best Heretic version of any open model.
        </h1>
        <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">
          Every Heretic (abliterated) conversion on Hugging Face, resolved back to the
          model it came from and ranked by the two numbers that actually matter: how
          little the model drifted, and how few refusals remain.
        </p>
        <form action="/models/" method="get" className="flex max-w-xl gap-2">
          <input
            type="search"
            name="q"
            placeholder="Qwen3-4B, gemma-3-12b-it, gpt-oss-20b…"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            aria-label="Search for a model"
          />
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Find
          </button>
        </form>
      </section>

      <section className="grid grid-cols-2 gap-6 rounded-lg border border-zinc-200 bg-white p-5 sm:grid-cols-4 dark:border-zinc-800 dark:bg-zinc-950">
        <Stat label="Models indexed" value={formatCompact(snapshot.totals.origins)} hint="canonical base models" />
        <Stat
          label="Ranked conversions"
          value={formatCompact(snapshot.totals.rankedRecipes)}
          hint={`${formatCompact(snapshot.totals.recipes)} with published metrics`}
        />
        <Stat label="Heretic repos" value={formatCompact(snapshot.totals.verifiedRepos)} hint={`${formatCompact(snapshot.totals.repos)} discovered`} />
        <Stat
          label="Downloads"
          value={formatCompact(snapshot.totals.downloadsAllTime)}
          hint={`updated ${formatDate(snapshot.updatedAt)}`}
        />
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Cleanest conversions</h2>
            <p className="text-sm text-zinc-500">
              Highest score across all families. Filter by size and family on the leaderboard.
            </p>
          </div>
          <Link className="text-sm underline" href="/leaderboard/">
            Full leaderboard
          </Link>
        </div>
        <Card className="p-0">
          <div className="px-4 py-2">
            <RecipeTable rows={top} />
          </div>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Browse by family</h2>
          <Link className="text-sm underline" href="/families/">
            All families
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {families.map((family) => (
            <Link
              key={family.slug}
              href={familyHref(family.slug)}
              className="rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
            >
              <div className="font-medium">{family.label}</div>
              <div className="text-xs text-zinc-500">
                {family.originCount} models · {family.rankedRecipeCount} ranked
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
        <h2 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-100">How to read this</h2>
        <p>
          <strong>KL</strong> measures how far the abliterated model drifted from the original —
          lower is better. <strong>Refusals</strong> are counted on a harmful-prompt set by the
          publisher — lower is better. The <strong>score</strong> weights both equally.{" "}
          <Link className="underline" href="/methodology/">
            Full methodology
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
