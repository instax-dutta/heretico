import Link from "next/link";
import {
  formatCompact,
  formatParams,
  formatPercent,
  formatKl,
  huggingFaceUrl,
  originHref,
} from "@/lib/format";
import type { LeaderboardRow } from "@/lib/query";
import { Badge, ScorePill, VerificationBadge } from "./ui";

export function RecipeTable({
  rows,
  showRank = true,
  showOrigin = true,
  emptyLabel = "Nothing matches these filters yet.",
}: {
  rows: LeaderboardRow[];
  showRank?: boolean;
  showOrigin?: boolean;
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-zinc-500">{emptyLabel}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-zinc-500 border-zinc-800">
            {showRank ? <th className="w-12 py-2 pr-2 font-medium">#</th> : null}
            {showOrigin ? (
              <th className="py-2 pr-3 font-medium" title="The original model this conversion was made from">
                Model
              </th>
            ) : null}
            <th className="py-2 pr-3 font-medium" title="Who published the conversion">
              Author
            </th>
            <th
              className="py-2 pr-3 text-right font-medium"
              title="Model size in billions of parameters"
            >
              Params
            </th>
            <th
              className="py-2 pr-3 text-right font-medium"
              title="KL divergence: how far the abliterated weights moved from the original, measured on harmless prompts. Lower is better."
            >
              KL
            </th>
            <th
              className="py-2 pr-3 text-right font-medium"
              title="How many of the publisher's harmful prompts the model still refuses. Lower is better."
            >
              Refusals
            </th>
            <th
              className="py-2 pr-3 text-right font-medium"
              title="KL and refusals combined, weighted equally, out of 100. Higher is better."
            >
              Score
            </th>
            <th
              className="py-2 pr-3 font-medium"
              title="What backs these numbers: a verified conversion ships real weights, an unverified one rests on its card alone"
            >
              Evidence
            </th>
            <th className="py-2 text-right font-medium" title="Hub download counter, not a count of people">
              Downloads
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { recipe, origin } = row;
            return (
              <tr
                key={recipe.id}
                className="border-b align-top last:border-0 border-zinc-900"
              >
                {showRank ? (
                  <td className="py-2 pr-2 tabular-nums text-zinc-500">
                    {row.rank ?? "—"}
                  </td>
                ) : null}
                {showOrigin ? (
                  <td className="py-2 pr-3">
                    <Link
                      href={originHref(origin.id)}
                      className="font-medium hover:underline"
                      title={origin.id}
                    >
                      {origin.displayName}
                    </Link>
                    <div className="text-xs text-zinc-500">{origin.owner}</div>
                  </td>
                ) : null}
                <td className="py-2 pr-3">
                  <a
                    className="hover:underline"
                    href={huggingFaceUrl(recipe.bestRepoId)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {recipe.author}
                  </a>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  {formatParams(origin.paramsB, origin.paramsActiveB, origin.moe)}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatKl(recipe.kl)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  {recipe.refusals}/{recipe.refusalTotal}
                  <span className="ml-1 text-xs text-zinc-500">
                    {formatPercent(recipe.refusalRate, 0)}
                  </span>
                </td>
                <td className="py-2 pr-3 text-right">
                  <ScorePill score={recipe.score} />
                </td>
                <td className="py-2 pr-3">
                  <div className="flex flex-wrap gap-1">
                    {recipe.bestPick ? <Badge tone="good">Best</Badge> : null}
                    <VerificationBadge verification={recipe.verification} />
                    {recipe.implausible ? (
                      <Badge tone="warn" title="The card reports a KL divergence below what an abliteration can produce, so the weights were not measurably changed">
                        implausible
                      </Badge>
                    ) : null}
                    {recipe.pareto ? (
                      <Badge tone="accent" title="No other version of this model is better on both KL and refusals">
                        Pareto
                      </Badge>
                    ) : null}
                    {recipe.formats.slice(0, 3).map((format) => (
                      <Badge key={format}>{format.toUpperCase()}</Badge>
                    ))}
                  </div>
                </td>
                <td className="py-2 tabular-nums text-zinc-400">
                  {formatCompact(recipe.downloadsAllTime)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
