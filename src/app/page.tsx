import type { Metadata } from "next";
import Link from "next/link";
import { Glossary } from "@/components/Glossary";
import { RecipeTable } from "@/components/RecipeTable";
import { Card, MetricLegend, Stat } from "@/components/ui";
import { getSnapshot, getTopRows } from "@/lib/dataset";
import { familyHref, formatCompact, formatDate } from "@/lib/format";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const snapshot = getSnapshot();
  const top = getTopRows(10);
  // A "family" of one model is not a family: it is a model whose name the
  // classifier could not place. Showing those next to Qwen and Llama makes the
  // browse grid noise, so they live on the families page instead.
  const families = [...snapshot.families]
    .filter((family) => family.originCount >= 2)
    .sort((a, b) => b.originCount - a.originCount)
    .slice(0, 12);
  const smallFamilies = snapshot.families.filter((family) => family.originCount < 2).length;

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Find the best Heretic version of any open model.
        </h1>
        <p className="max-w-2xl text-zinc-400">
          &ldquo;Abliteration&rdquo; removes a model&apos;s refusal behaviour by editing its
          weights. It works, but the weights move a little too, and that movement can cost
          quality. Thousands of people have published the result here. This site reads their
          model cards, works out which version is the cleanest, and ranks them.
        </p>
        <form action="/models/" method="get" className="flex max-w-xl gap-2">
          <input
            type="search"
            name="q"
            placeholder="Qwen3-4B, gemma-3-12b-it, gpt-oss-20b…"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-zinc-500 border-zinc-700 bg-zinc-900"
            aria-label="Search for a model"
          />
          <button
            type="submit"
            className="rounded-md px-4 py-2 font-medium bg-zinc-100 text-zinc-900 hover:bg-zinc-300"
          >
            Find
          </button>
        </form>
        <p className="max-w-xl text-xs text-zinc-500">
          Search for the <strong className="font-medium text-zinc-400">original</strong> model,
          not the uncensored one &mdash; &ldquo;Qwen3-4B&rdquo;, not
          &ldquo;Qwen3-4B-Uncensored-Heretic&rdquo;. Every version of a model is grouped under
          the one it came from.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-6 rounded-lg border p-5 sm:grid-cols-4 border-zinc-800 bg-zinc-950">
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
            <MetricLegend />
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
              className="rounded-lg border p-4 border-zinc-800 bg-zinc-950 hover:border-zinc-600"
            >
              <div className="font-medium">{family.label}</div>
              <div className="text-xs text-zinc-500">
                {family.originCount} models · {family.rankedRecipeCount} ranked
              </div>
            </Link>
          ))}
        </div>
        {smallFamilies > 0 ? (
          <p className="mt-3 text-xs text-zinc-500">
            {smallFamilies} more groups hold a single model each. They are on the{" "}
            <Link className="underline" href="/families/">
              families page
            </Link>
            .
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">Before you read a number</h2>
        <p className="max-w-3xl text-zinc-400">
          Every number here is self-reported by whoever published the model. This site never
          re-runs an evaluation, so what it can tell you is what stands behind a number: whether
          the repository also ships real weights, and whether the reported damage is one an
          abliteration can physically produce. A row that rests on its model card alone still
          ranks, but it can never come first.
        </p>
        <Glossary />
        <p className="text-sm text-zinc-500">
          The{" "}
          <Link className="underline" href="/methodology/">
            methodology page
          </Link>{" "}
          has the exact scoring formula and the full list of caveats.
        </p>
      </section>
    </div>
  );
}
