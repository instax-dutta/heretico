import type { Metadata } from "next";
import { Glossary } from "@/components/Glossary";
import { LeaderboardExplorer } from "@/components/LeaderboardExplorer";
import { getLeaderboardRows, getSnapshot } from "@/lib/dataset";
import { compareForLeaderboard } from "@/lib/scoring";

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
    .sort((a, b) => compareForLeaderboard(a.recipe, b.recipe));
  const initialRows = ranked.slice(0, 50);
  const versions = [...new Set(snapshot.recipes.map((recipe) => recipe.hereticVersion))]
    .filter((version): version is string => Boolean(version))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
        <p className="max-w-3xl text-zinc-400">
          Every published abliteration, ranked by how little it damaged the model (KL) and how
          few refusals are left. One row is one ablation attempt, not one repository: a
          conversion and its GGUF and MLX files share a score, so uploading more quant files
          cannot climb the list.
        </p>
      </header>

      <Glossary title="What the columns and badges mean" />

      <LeaderboardExplorer
        initialRows={initialRows}
        families={snapshot.families.map((family) => ({ slug: family.slug, label: family.label }))}
        versions={versions}
        total={ranked.length}
      />
    </div>
  );
}
