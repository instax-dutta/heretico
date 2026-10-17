import type { Metadata } from "next";
import { LeaderboardExplorer } from "@/components/LeaderboardExplorer";
import { getLeaderboardRows, getSnapshot } from "@/lib/dataset";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "Ranked Heretic conversions across every model family, filterable by family, parameter class, format, artifact type and Heretic version. Sorted by KL divergence and refusal rate.",
  alternates: { canonical: "/leaderboard/" },
};

export default function LeaderboardPage() {
  const snapshot = getSnapshot();
  const rows = getLeaderboardRows();
  const ranked = rows
    .filter((row) => row.recipe.score > 0)
    .sort((a, b) => b.recipe.score - a.recipe.score || a.recipe.id.localeCompare(b.recipe.id));
  const initialRows = ranked.slice(0, 50);
  const versions = [...new Set(snapshot.recipes.map((recipe) => recipe.hereticVersion))]
    .filter((version): version is string => Boolean(version))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
        <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
          One row per ablation attempt, not per repository: a conversion and its GGUF/MLX
          artifacts share a score, so quant spam cannot climb the list. Scores weight KL
          divergence and refusal rate equally.{" "}
          <a className="underline" href="/methodology/">
            How scoring works
          </a>
          .
        </p>
      </header>

      <LeaderboardExplorer
        initialRows={initialRows}
        families={snapshot.families.map((family) => ({ slug: family.slug, label: family.label }))}
        versions={versions}
        total={ranked.length}
      />
    </div>
  );
}
