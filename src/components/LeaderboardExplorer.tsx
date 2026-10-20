"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildLeaderboardRows,
  DEFAULT_QUERY,
  parseQuery,
  queryToSearchParams,
  runQuery,
  type LeaderboardQuery,
  type LeaderboardRow,
  type SortKey,
} from "@/lib/query";
import { SIZE_CLASSES } from "@/lib/naming";
import type { ClientIndex } from "@/lib/query";
import { RecipeTable } from "./RecipeTable";
import { MetricLegend } from "./ui";

const FORMATS = ["gguf", "safetensors", "mlx", "fp8", "nvfp4", "awq", "gptq", "exl", "lora"];
const KINDS = [
  { value: "heretic", label: "Direct conversion" },
  { value: "quant", label: "Quantized artifact" },
  { value: "finetune", label: "Finetune of a conversion" },
  { value: "merge", label: "Merge" },
  { value: "lora", label: "LoRA" },
];
const SORTS: { value: SortKey; label: string }[] = [
  { value: "score", label: "Score" },
  { value: "kl", label: "KL divergence" },
  { value: "refusals", label: "Refusal rate" },
  { value: "downloads", label: "Downloads" },
  { value: "params", label: "Parameters" },
  { value: "newest", label: "Newest" },
  { value: "model", label: "Model name" },
];

export function LeaderboardExplorer({
  initialRows,
  families,
  versions,
  total,
}: {
  initialRows: LeaderboardRow[];
  families: { slug: string; label: string }[];
  versions: string[];
  total: number;
}) {
  const [query, setQuery] = useState<LeaderboardQuery>(DEFAULT_QUERY);
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);

  useEffect(() => {
    // The URL is external state in a static export. Applying it after mount is
    // what keeps the prerendered first page and the hydrated page identical.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(parseQuery(new URLSearchParams(window.location.search)));
    let cancelled = false;
    fetch("/data/index.json")
      .then((response) => response.json() as Promise<ClientIndex>)
      .then((index) => {
        if (!cancelled) setRows(buildLeaderboardRows(index));
      })
      .catch(() => {
        /* keep the prerendered first page */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function update(next: LeaderboardQuery) {
    setQuery(next);
    const params = queryToSearchParams(next).toString();
    window.history.replaceState(null, "", params ? `?${params}` : window.location.pathname);
  }

  function patch(part: Partial<LeaderboardQuery>) {
    update({ ...query, ...part, page: part.page ?? 1 });
  }

  const source = rows ?? initialRows;
  const result = useMemo(() => runQuery(source, query), [source, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-4 border-zinc-800 bg-zinc-950">
        <label className="flex flex-col gap-1 text-xs text-zinc-500 lg:col-span-2">
          Search
          <input
            type="search"
            value={query.q}
            onChange={(event) => patch({ q: event.target.value })}
            placeholder="Model, owner or repository"
            className="rounded border px-2 py-1.5 border-zinc-700 bg-zinc-900 text-zinc-100"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Family
          <select
            value={query.family}
            onChange={(event) => patch({ family: event.target.value })}
            className="rounded border px-2 py-1.5 border-zinc-700 bg-zinc-900 text-zinc-100"
          >
            <option value="">All families</option>
            {families.map((family) => (
              <option key={family.slug} value={family.slug}>
                {family.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Parameters
          <select
            value={query.size}
            onChange={(event) => patch({ size: event.target.value })}
            className="rounded border px-2 py-1.5 border-zinc-700 bg-zinc-900 text-zinc-100"
          >
            <option value="">Any size</option>
            {SIZE_CLASSES.filter((size) => size.key !== "unknown").map((size) => (
              <option key={size.key} value={size.key}>
                {size.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Format
          <select
            value={query.format}
            onChange={(event) => patch({ format: event.target.value })}
            className="rounded border px-2 py-1.5 border-zinc-700 bg-zinc-900 text-zinc-100"
          >
            <option value="">Any format</option>
            {FORMATS.map((format) => (
              <option key={format} value={format}>
                {format.toUpperCase()}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Artifact type
          <select
            value={query.kind}
            onChange={(event) => patch({ kind: event.target.value })}
            className="rounded border px-2 py-1.5 border-zinc-700 bg-zinc-900 text-zinc-100"
          >
            <option value="">Any type</option>
            {KINDS.map((kind) => (
              <option key={kind.value} value={kind.value}>
                {kind.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Heretic version
          <select
            value={query.version}
            onChange={(event) => patch({ version: event.target.value })}
            className="rounded border px-2 py-1.5 border-zinc-700 bg-zinc-900 text-zinc-100"
          >
            <option value="">Any version</option>
            {versions.map((version) => (
              <option key={version} value={version}>
                v{version}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Min downloads
          <input
            type="number"
            min={0}
            step={100}
            value={query.minDownloads}
            onChange={(event) => patch({ minDownloads: Number(event.target.value) || 0 })}
            className="rounded border px-2 py-1.5 border-zinc-700 bg-zinc-900 text-zinc-100"
          />
        </label>

        <div className="flex flex-col gap-1 text-xs text-zinc-500">
          Sort
          <div className="flex gap-2">
            <select
              value={query.sort}
              onChange={(event) => {
                const sort = event.target.value as SortKey;
                const dir =
                  sort === "kl" || sort === "refusals" || sort === "params" || sort === "model"
                    ? "asc"
                    : "desc";
                update({ ...query, sort, dir, page: 1 });
              }}
              className="w-full rounded border px-2 py-1.5 border-zinc-700 bg-zinc-900 text-zinc-100"
            >
              {SORTS.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  {sort.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => patch({ dir: query.dir === "asc" ? "desc" : "asc" })}
              className="rounded border px-2 py-1.5 text-sm border-zinc-700"
              title="Toggle sort direction"
            >
              {query.dir === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-zinc-400 lg:col-span-2">
          <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap">
            <input
              type="checkbox"
              className="accent-emerald-400"
              checked={query.hasBenchmarks}
              onChange={(event) => patch({ hasBenchmarks: event.target.checked })}
            />
            Has benchmarks
          </label>
          <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap">
            <input
              type="checkbox"
              className="accent-emerald-400"
              checked={!query.rankedOnly}
              onChange={(event) => patch({ rankedOnly: !event.target.checked })}
            />
            Include unmeasured
          </label>
          <button
            type="button"
            className="ml-auto rounded text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-200 hover:underline"
            onClick={() => update({ ...DEFAULT_QUERY })}
          >
            Reset filters
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          {result.total.toLocaleString("en-US")} ranked conversions
          {rows === null ? " (loading full index…)" : ""} of {total.toLocaleString("en-US")} with
          published metrics
        </span>
        <label className="flex items-center gap-2">
          Per page
          <select
            value={query.perPage}
            onChange={(event) => patch({ perPage: Number(event.target.value) })}
            className="rounded border px-1 py-0.5 border-zinc-700 bg-zinc-900"
          >
            {[25, 50, 100, 200].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border px-4 border-zinc-800 bg-zinc-950">
        <RecipeTable rows={result.rows} />
        <MetricLegend />
      </div>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          disabled={result.page <= 1}
          onClick={() => patch({ page: result.page - 1 })}
          className="rounded border px-3 py-1 disabled:opacity-40 border-zinc-700"
        >
          Previous
        </button>
        <span className="text-xs text-zinc-500">
          Page {result.page} of {result.pageCount}
        </span>
        <button
          type="button"
          disabled={result.page >= result.pageCount}
          onClick={() => patch({ page: result.page + 1 })}
          className="rounded border px-3 py-1 disabled:opacity-40 border-zinc-700"
        >
          Next
        </button>
      </div>
    </div>
  );
}
