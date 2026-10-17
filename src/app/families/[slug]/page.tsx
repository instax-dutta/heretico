import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecipeTable } from "@/components/RecipeTable";
import { Badge, Breadcrumbs, Card } from "@/components/ui";
import { getFamily, getFamilyOrigins, getLeaderboardRows, getSnapshot } from "@/lib/dataset";
import { familyHref, formatCompact, formatParams } from "@/lib/format";
import type { LeaderboardRow } from "@/lib/query";

export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return getSnapshot().families.map((family) => ({ slug: family.slug }));
}

export async function generateMetadata({ params }: PageProps<"/families/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const family = getFamily(slug);
  if (!family) return {};
  return {
    title: `${family.label} Heretic models`,
    description: `Heretic (abliterated) conversions of ${family.label} models, ranked by KL divergence and refusal rate across ${family.originCount} base models.`,
    alternates: { canonical: familyHref(slug) },
  };
}

export default async function FamilyPage({ params }: PageProps<"/families/[slug]">) {
  const { slug } = await params;
  const family = getFamily(slug);
  if (!family) notFound();

  const origins = getFamilyOrigins(slug);
  const rows = getLeaderboardRows()
    .filter((row) => row.origin.familySlug === slug && row.recipe.bestPick)
    .sort((a, b) => b.recipe.score - a.recipe.score || a.recipe.id.localeCompare(b.recipe.id));
  const ranked: LeaderboardRow[] = rows.map((row, index) => ({ ...row, rank: index + 1 }));

  const unmeasured = origins.filter((origin) => origin.bestRecipeId === null);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Breadcrumbs items={[{ label: "Families", href: "/families/" }, { label: family.label }]} />
        <h1 className="text-2xl font-semibold tracking-tight">{family.label}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>{origins.length} models</Badge>
          <Badge>{family.rankedRecipeCount} ranked conversions</Badge>
          <Badge>{formatCompact(family.downloadsAllTime)} downloads</Badge>
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold tracking-tight">Best conversion per model</h2>
        <p className="mb-3 text-sm text-zinc-500">
          One row per base model. The full list of attempts is on each model page.
        </p>
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950">
          <RecipeTable rows={ranked} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold tracking-tight">All models</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {origins.map((origin) => (
            <Link
              key={origin.id}
              href={`/models/${origin.id}/`}
              className="flex items-baseline justify-between gap-2 rounded border border-zinc-200 bg-white px-3 py-2 text-sm hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
            >
              <span className="truncate">{origin.displayName}</span>
              <span className="shrink-0 text-xs text-zinc-500">
                {formatParams(origin.paramsB, origin.paramsActiveB, origin.moe)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {unmeasured.length > 0 ? (
        <Card>
          <h2 className="mb-1 text-sm font-semibold">Unmeasured models</h2>
          <p className="text-xs text-zinc-500">
            {unmeasured.map((origin) => origin.displayName).join(", ")} — conversions exist but
            their publishers did not report KL and refusal numbers, so they are not ranked.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
