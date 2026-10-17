import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Breadcrumbs, Card } from "@/components/ui";
import { getMeasuredRepos, getOrigin, getRepo } from "@/lib/dataset";
import {
  formatCompact,
  formatDate,
  formatKl,
  formatPercent,
  huggingFaceUrl,
  originHref,
  repoHref,
} from "@/lib/format";
import type { RepoRecord } from "@/lib/types";

export const dynamicParams = false;

export function generateStaticParams(): { id: string[] }[] {
  // Only artifacts that published numbers get a page. See `getMeasuredRepos`.
  return getMeasuredRepos().map((repo) => ({ id: repo.id.split("/") }));
}

export async function generateMetadata({ params }: PageProps<"/repo/[...id]">): Promise<Metadata> {
  const { id } = await params;
  const repo = getRepo(id.join("/"));
  if (!repo) return {};
  const origin = repo.originId ? getOrigin(repo.originId) : undefined;
  return {
    title: `${repo.id} — Heretic artifact`,
    description: `Provenance, formats and published KL/refusal metrics for ${repo.id}${
      origin ? `, a Heretic conversion of ${origin.id}` : ""
    }.`,
    alternates: { canonical: repoHref(repo.id) },
  };
}

function Confidence({ repo }: { repo: RepoRecord }) {
  const label =
    repo.metrics.confidence === "inherited"
      ? "Inherited from the parent conversion"
      : repo.metrics.confidence === "none"
        ? "No published metrics"
        : "Published on the model card";
  if (repo.metrics.sourceRepoId) {
    return (
      <span>
        {label} —{" "}
        <Link className="underline" href={repoHref(repo.metrics.sourceRepoId)}>
          source
        </Link>
      </span>
    );
  }
  return <span>{label}</span>;
}

export default async function RepoPage({ params }: PageProps<"/repo/[...id]">) {
  const { id } = await params;
  const repo = getRepo(id.join("/"));
  if (!repo) notFound();
  const origin = repo.originId ? getOrigin(repo.originId) : undefined;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Breadcrumbs
          items={[
            { label: "Models", href: "/models/" },
            ...(origin ? [{ label: origin.displayName, href: originHref(origin.id) }] : []),
            { label: repo.id.split("/").pop() ?? repo.id },
          ]}
        />
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {repo.id.split("/").pop()}
            </h1>
            <p className="font-mono text-xs text-zinc-500">{repo.id}</p>
          </div>
          <a
            className="text-sm underline"
            href={huggingFaceUrl(repo.id)}
            rel="noreferrer"
            target="_blank"
          >
            Open on Hugging Face
          </a>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="accent">{repo.kind}</Badge>
          {repo.formats.map((format) => (
            <Badge key={format}>{format.toUpperCase()}</Badge>
          ))}
          {repo.quant ? <Badge>{repo.quant}</Badge> : null}
          {repo.gated ? <Badge tone="warn">gated</Badge> : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Published metrics
          </h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-zinc-500">KL divergence</dt>
              <dd className="text-lg font-semibold tabular-nums">{formatKl(repo.metrics.kl)}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Refusals</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {repo.metrics.refusals !== null && repo.metrics.refusalTotal !== null
                  ? `${repo.metrics.refusals}/${repo.metrics.refusalTotal}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Original refusals</dt>
              <dd className="tabular-nums">
                {repo.metrics.originalRefusals !== null
                  ? `${repo.metrics.originalRefusals}/${repo.metrics.originalRefusalTotal ?? 100}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Heretic version</dt>
              <dd className="tabular-nums">
                {repo.hereticVersion ? `v${repo.hereticVersion}` : "—"}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-zinc-500">
            <Confidence repo={repo} />
          </p>
          {repo.metrics.evidence ? (
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-zinc-500">Matched snippet</summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-zinc-100 p-2 font-mono text-[11px] dark:bg-zinc-900">
                {repo.metrics.evidence}
              </pre>
            </details>
          ) : null}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Provenance
          </h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div>
              <dt className="text-xs text-zinc-500">Canonical model</dt>
              <dd>{origin ? <Link className="underline" href={originHref(origin.id)}>{origin.id}</Link> : repo.originId}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Declared parent(s)</dt>
              <dd className="break-all font-mono text-xs">
                {repo.declaredBaseModels.length > 0 ? repo.declaredBaseModels.join(", ") : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Classification</dt>
              <dd>{repo.classificationEvidence}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Created / updated</dt>
              <dd className="tabular-nums">
                {formatDate(repo.createdAt)} / {formatDate(repo.lastModified)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Downloads</dt>
              <dd className="tabular-nums">
                {formatCompact(repo.downloadsAllTime)} all time ·{" "}
                {formatCompact(repo.downloads30d)} last 30 days
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">License</dt>
              <dd>{repo.license ?? "—"}</dd>
            </div>
          </dl>
        </Card>
      </div>

      {repo.benchmarks.length > 0 ? (
        <section>
          <h2 className="mb-2 text-lg font-semibold tracking-tight">Published benchmarks</h2>
          <p className="mb-2 text-xs text-zinc-500">
            Copied from the model card. These never affect the ranking.
          </p>
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                  <th className="px-4 py-2 font-medium">Metric</th>
                  <th className="py-2 pr-3 text-right font-medium">This model</th>
                  <th className="py-2 pr-3 text-right font-medium">Original</th>
                  <th className="py-2 pr-3 text-right font-medium">Delta</th>
                </tr>
              </thead>
              <tbody>
                {repo.benchmarks.map((benchmark) => (
                  <tr key={benchmark.metric} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                    <td className="px-4 py-2">{benchmark.metric}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{benchmark.value}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{benchmark.baseValue ?? "—"}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {benchmark.baseValue !== undefined
                        ? `${(benchmark.value - benchmark.baseValue).toFixed(1)}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <p className="text-xs text-zinc-500">
        {repo.metrics.refusals !== null && repo.metrics.refusalTotal
          ? `Refusal rate ${formatPercent(repo.metrics.refusals / repo.metrics.refusalTotal, 0)}. `
          : ""}
        Metrics are self-reported by the publisher; the directory does not re-run evaluations.
      </p>
    </div>
  );
}
