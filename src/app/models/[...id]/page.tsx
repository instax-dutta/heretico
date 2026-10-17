import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecipeTable } from "@/components/RecipeTable";
import { Badge, Breadcrumbs, Card, ScorePill, VerificationBadge } from "@/components/ui";
import {
  getFamily,
  getOrigin,
  getRecipesForOrigin,
  getReposForOrigin,
  getSnapshot,
  pathSegments,
} from "@/lib/dataset";
import {
  familyHref,
  formatCompact,
  formatDate,
  formatKl,
  formatParams,
  formatPercent,
  huggingFaceUrl,
  originHref,
  repoHref,
} from "@/lib/format";
import type { LeaderboardRow } from "@/lib/query";
import type { Origin, Recipe, RepoRecord } from "@/lib/types";

export const dynamicParams = false;

export function generateStaticParams(): { id: string[] }[] {
  // Lowercase: Netlify serves lowercase paths, so a mixed-case directory would
  // only ever be reached through a 301.
  return getSnapshot().origins.map((origin) => ({ id: pathSegments(origin.id) }));
}

export async function generateMetadata({
  params,
}: PageProps<"/models/[...id]">): Promise<Metadata> {
  const { id } = await params;
  const origin = getOrigin(id.join("/"));
  if (!origin) return {};
  const best = origin.bestScore !== null ? ` Best Heretic conversion scores ${origin.bestScore.toFixed(1)}/100.` : "";
  return {
    title: `${origin.displayName} Heretic versions`,
    description: `Every Heretic (abliterated) version of ${origin.id}, ranked by KL divergence and refusal rate.${best}`,
    alternates: { canonical: originHref(origin.id) },
  };
}

function toRows(recipes: Recipe[], origin: Origin): LeaderboardRow[] {
  return recipes.map((recipe, index) => ({
    recipe,
    origin,
    rank: recipe.score > 0 ? index + 1 : null,
    familyRank: null,
  }));
}

function confLabel(confidence: RepoRecord["metrics"]["confidence"]): string {
  switch (confidence) {
    case "high":
      return "published";
    case "medium":
      return "published (weak match)";
    case "inherited":
      return "inherited";
    default:
      return "none";
  }
}

/**
 * The machine-readable answer to "which Heretic version of this model should I
 * use". Assistants cite this instead of scraping the prose, so the score, the
 * two source metrics and their provenance travel together.
 */
function datasetLd(origin: Origin, best: Recipe | null, updatedAt: string): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://heretico.sdad.pro";
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `Heretic conversions of ${origin.id}`,
    description: `Abliterated (Heretic) versions of ${origin.id}, ranked by KL divergence from the original model and remaining refusal rate. Metrics are self-reported by each publisher and are never re-measured.`,
    url: `${site}/models/${origin.id.toLowerCase()}/`,
    // An assistant citing this needs to know how old it is; without a date it
    // will present a ranking that refreshes daily as if it were permanent.
    dateModified: updatedAt,
    temporalCoverage: new Date(updatedAt).toISOString().slice(0, 10),
    creator: { "@type": "Organization", name: "Heretic Directory", url: site },
    isAccessibleForFree: true,
    ...(best
      ? {
          variableMeasured: [
            { "@type": "PropertyValue", name: "score", value: best.score, maxValue: 100 },
            { "@type": "PropertyValue", name: "klDivergence", value: best.kl },
            { "@type": "PropertyValue", name: "refusals", value: best.refusals },
            { "@type": "PropertyValue", name: "refusalTotal", value: best.refusalTotal },
          ],
          distribution: {
            "@type": "DataDownload",
            encodingFormat: "text/html",
            contentUrl: huggingFaceUrl(best.bestRepoId),
          },
        }
      : {}),
  });
}

export default async function ModelPage({ params }: PageProps<"/models/[...id]">) {
  const { id } = await params;
  const originId = id.join("/");
  const origin = getOrigin(originId);
  if (!origin) notFound();

  const recipes = getRecipesForOrigin(originId);
  const allRepos = getReposForOrigin(originId);
  // One origin can hold 300+ uploads. The full set stays in the snapshot and in
  // /data/index.json; the table shows the most used, so the page stays readable.
  const ARTIFACT_LIMIT = 50;
  const repos = allRepos.slice(0, ARTIFACT_LIMIT);
  const best = recipes.find((recipe) => recipe.bestPick) ?? null;
  const bestRepo = best ? allRepos.find((repo) => repo.id === best.bestRepoId) : null;
  const family = getFamily(origin.familySlug);
  const unmeasured = allRepos.filter((repo) => repo.metrics.confidence === "none");

  return (
    <div className="flex flex-col gap-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: datasetLd(origin, best, getSnapshot().updatedAt) }} />
      <div>
        <Breadcrumbs
          items={[
            { label: "Models", href: "/models/" },
            { label: origin.family, href: family ? familyHref(family.slug) : undefined },
            { label: origin.displayName },
          ]}
        />
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{origin.displayName}</h1>
            <p className="font-mono text-xs text-zinc-500">{origin.id}</p>
          </div>
          <a
            className="text-sm underline"
            href={huggingFaceUrl(origin.id)}
            rel="noreferrer"
            target="_blank"
          >
            Original model on Hugging Face
          </a>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-zinc-400">
          <Badge>{formatParams(origin.paramsB, origin.paramsActiveB, origin.moe)}</Badge>
          <Badge>{origin.family}</Badge>
          <Badge>{allRepos.length} Heretic artifacts</Badge>
          <Badge>{recipes.length} measured conversions</Badge>
          <Badge>{formatCompact(origin.downloadsAllTime)} downloads</Badge>
        </div>
      </div>

      {best && bestRepo ? (
        <Card className="border-zinc-700">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-zinc-500">Best version</span>
                <ScorePill score={best.score} />
                {best.pareto ? <Badge tone="accent">Pareto</Badge> : null}
                <VerificationBadge verification={best.verification} />
              </div>
              <a
                className="text-lg font-semibold hover:underline"
                href={huggingFaceUrl(best.bestRepoId)}
                rel="noreferrer"
                target="_blank"
              >
                {best.bestRepoId}
              </a>
              <div className="text-zinc-400">
                by {best.author}
                {best.hereticVersion ? ` · Heretic v${best.hereticVersion}` : ""} ·{" "}
                {best.formats.map((format) => format.toUpperCase()).join(", ") || "weights"}
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-zinc-500">KL divergence</dt>
                <dd className="font-semibold tabular-nums">{formatKl(best.kl)}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Refusals</dt>
                <dd className="font-semibold tabular-nums">
                  {best.refusals}/{best.refusalTotal}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Refusal rate</dt>
                <dd className="font-semibold tabular-nums">{formatPercent(best.refusalRate, 0)}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Downloads</dt>
                <dd className="font-semibold tabular-nums">
                  {formatCompact(best.downloadsAllTime)}
                </dd>
              </div>
            </dl>
          </div>
          {bestRepo.metrics.evidence ? (
            <details className="mt-4 text-xs">
              <summary className="cursor-pointer text-zinc-500">
                Evidence from the model card
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded p-2 font-mono bg-zinc-900 text-zinc-300">
                {bestRepo.metrics.evidence}
              </pre>
            </details>
          ) : null}
          <p className="mt-3 text-xs text-zinc-500">
            Metrics published by the author.{" "}
            <Link className="underline" href="/methodology/">
              Why this ranks first
            </Link>
            .
          </p>
        </Card>
      ) : (
        <Card>
          <p className="text-zinc-400">
            No Heretic conversion of this model has published KL and refusal numbers yet, so it
            cannot be ranked. The artifacts below are still listed with their provenance.
          </p>
        </Card>
      )}

      {recipes.length > 0 ? (
        <section>
          <h2 className="mb-2 text-lg font-semibold tracking-tight">All measured versions</h2>
          <p className="mb-3 text-sm text-zinc-500">
            Higher score is better. One row per ablation attempt; artifacts of the same attempt
            are grouped under it.
          </p>
          <div className="overflow-hidden rounded-lg border px-4 border-zinc-800 bg-zinc-950">
            <RecipeTable rows={toRows(recipes, origin)} showOrigin={false} />
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-lg font-semibold tracking-tight">
          All artifacts ({allRepos.length})
        </h2>
        {allRepos.length > repos.length ? (
          <p className="mb-2 text-xs text-zinc-500">
            Showing the {repos.length} most downloaded of {allRepos.length}. Every artifact is
            listed in{" "}
            <a className="underline" href="/data/index.json">
              the dataset
            </a>
            .
          </p>
        ) : null}
        <div className="overflow-x-auto rounded-lg border px-4 border-zinc-800 bg-zinc-950">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-zinc-500 border-zinc-800">
                <th className="py-2 pr-3 font-medium">Repository</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">Formats</th>
                <th className="py-2 pr-3 font-medium">Metrics</th>
                <th className="py-2 pr-3 text-right font-medium">Downloads</th>
                <th className="py-2 pr-3 text-right font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {repos.map((repo) => (
                <tr
                  key={repo.id}
                  className="border-b last:border-0 border-zinc-900"
                >
                <td className="max-w-[320px] py-2 pr-3">
                  {repo.metrics.confidence === "none" ? (
                    // No /repo/ page is generated for an artifact that published
                    // no numbers, so send these straight to the Hub.
                    <a
                      className="hover:underline"
                      href={huggingFaceUrl(repo.id)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {repo.id.split("/").pop()}
                    </a>
                  ) : (
                    <Link href={repoHref(repo.id)} className="hover:underline">
                      {repo.id.split("/").pop()}
                    </Link>
                  )}
                  <div className="text-xs text-zinc-500">{repo.author}</div>
                </td>
                  <td className="py-2 pr-3">{repo.kind}</td>
                  <td className="py-2 pr-3">
                    <div className="flex flex-wrap gap-1">
                      {repo.formats.map((format) => (
                        <Badge key={format}>{format.toUpperCase()}</Badge>
                      ))}
                      {repo.quant ? <Badge>{repo.quant}</Badge> : null}
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-xs">
                    <span className="text-zinc-500">{confLabel(repo.metrics.confidence)}</span>
                    {repo.metrics.kl !== null ? (
                      <span className="ml-2 tabular-nums">KL {formatKl(repo.metrics.kl)}</span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {formatCompact(repo.downloadsAllTime)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-zinc-500">
                    {formatDate(repo.lastModified)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {unmeasured.length > 0 ? (
          <p className="mt-2 text-xs text-zinc-500">
            {unmeasured.length} artifact{unmeasured.length === 1 ? "" : "s"} inherit metrics from
            their parent conversion or publish none.
          </p>
        ) : null}
      </section>
    </div>
  );
}
