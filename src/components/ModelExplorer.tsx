"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SIZE_CLASSES } from "@/lib/naming";
import {
  formatCompact,
  formatKl,
  formatParams,
  formatPercent,
  originHref,
  familyHref,
} from "@/lib/format";
import type { ClientIndex } from "@/lib/query";
import type { Origin } from "@/lib/types";
import { Badge, ScorePill } from "./ui";

type SortKey = "score" | "name" | "params" | "downloads";

const PER_PAGE = 50;

export function ModelExplorer({
  initialOrigins,
  families,
  total,
}: {
  initialOrigins: Origin[];
  families: { slug: string; label: string }[];
  total: number;
}) {
  const [origins, setOrigins] = useState<Origin[] | null>(null);
  const [q, setQ] = useState("");
  const [family, setFamily] = useState("");
  const [size, setSize] = useState("");
  const [rankedOnly, setRankedOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("score");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // URL state is external; applying it after mount keeps hydration stable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ(params.get("q") ?? "");
    setFamily(params.get("family") ?? "");
    setSize(params.get("size") ?? "");
    fetch("/data/index.json")
      .then((response) => response.json() as Promise<ClientIndex>)
      .then((index) => setOrigins(index.origins))
      .catch(() => {
        /* keep the prerendered list */
      });
  }, []);

  const source = origins ?? initialOrigins;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = source.filter((origin) => {
      if (family && origin.familySlug !== family) return false;
      if (size && origin.sizeClass !== size) return false;
      if (rankedOnly && origin.bestScore === null) return false;
      if (!needle) return true;
      return `${origin.id} ${origin.name} ${origin.owner}`.toLowerCase().includes(needle);
    });
    return list.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id);
        case "params":
          return (a.paramsB ?? Infinity) - (b.paramsB ?? Infinity);
        case "downloads":
          return b.downloadsAllTime - a.downloadsAllTime;
        default:
          return (b.bestScore ?? -1) - (a.bestScore ?? -1) || b.downloadsAllTime - a.downloadsAllTime;
      }
    });
  }, [source, q, family, size, rankedOnly, sort]);

  // One table row is ~8 elements, so rendering every origin at once costs
  // thousands of DOM nodes on the slowest connection. Page it like the
  // leaderboard does.
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const visible = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-4 border-zinc-800 bg-zinc-950">
        <label className="flex flex-col gap-1 text-xs text-zinc-500 lg:col-span-2">
          Search model
            <input
              type="search"
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setPage(1);
              }}
              placeholder="The original model, e.g. Qwen3-4B"
              className="w-full rounded border px-2 py-1.5 border-zinc-700 bg-zinc-900 text-zinc-100"
            />
          </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Family
          <select
            value={family}
            onChange={(event) => {
              setFamily(event.target.value);
              setPage(1);
            }}
            className="rounded border px-2 py-1.5 border-zinc-700 bg-zinc-900 text-zinc-100"
          >
            <option value="">All families</option>
            {families.map((entry) => (
              <option key={entry.slug} value={entry.slug}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Parameters
          <select
            value={size}
            onChange={(event) => {
              setSize(event.target.value);
              setPage(1);
            }}
            className="rounded border px-2 py-1.5 border-zinc-700 bg-zinc-900 text-zinc-100"
          >
            <option value="">Any size</option>
            {SIZE_CLASSES.filter((entry) => entry.key !== "unknown").map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-zinc-400">
          <input
            type="checkbox"
            checked={rankedOnly}
            onChange={(event) => {
              setRankedOnly(event.target.checked);
              setPage(1);
            }}
          />
          Measured versions only
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          Sort
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as SortKey);
              setPage(1);
            }}
            className="rounded border px-2 py-1 border-zinc-700 bg-zinc-900"
          >
            <option value="score">Best score</option>
            <option value="name">Name</option>
            <option value="params">Parameters</option>
            <option value="downloads">Downloads</option>
          </select>
        </label>
      </div>

      <p className="text-xs text-zinc-500">
        {filtered.length.toLocaleString("en-US")} models
        {origins === null ? " (loading full index…)" : ""} of {total.toLocaleString("en-US")} with
                a Heretic conversion. Search by the <strong className="font-medium text-zinc-400">original</strong>{" "}
                model name &mdash; every uncensored version of it is already grouped here.
      </p>

      <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-zinc-500 border-zinc-800">
              <th className="px-4 py-2 font-medium">Model</th>
              <th className="py-2 pr-3 font-medium">Family</th>
              <th className="py-2 pr-3 text-right font-medium">Params</th>
              <th className="py-2 pr-3 text-right font-medium">Best score</th>
              <th className="py-2 pr-3 text-right font-medium">KL</th>
              <th className="py-2 pr-3 text-right font-medium">Refusals</th>
              <th className="py-2 pr-3 text-right font-medium">Versions</th>
              <th className="py-2 pr-3 text-right font-medium">Downloads</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((origin) => (
              <tr
                key={origin.id}
                className="border-b last:border-0 border-zinc-900"
              >
                <td className="max-w-[280px] px-4 py-2">
                  <Link href={originHref(origin.id)} className="font-medium hover:underline">
                    {origin.displayName}
                  </Link>
                  <div className="text-xs text-zinc-500">{origin.owner}</div>
                </td>
                <td className="py-2 pr-3">
                  <Link className="hover:underline" href={familyHref(origin.familySlug)}>
                    {origin.family}
                  </Link>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  {formatParams(origin.paramsB, origin.paramsActiveB, origin.moe)}
                </td>
                <td className="py-2 pr-3 text-right">
                  {origin.bestScore !== null ? (
                    <ScorePill score={origin.bestScore} />
                  ) : (
                    <Badge tone="warn">unmeasured</Badge>
                  )}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatKl(origin.bestKl)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  {formatPercent(origin.bestRefusalRate, 0)}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{origin.recipeCount}</td>
                <td className="py-2 pr-3 tabular-nums text-zinc-400">
                  {formatCompact(origin.downloadsAllTime)}
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                  No model matches that search yet. Try the original model&apos;s name without
                  suffixes (for example <code>Qwen3-4B</code>), or clear the filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {pageCount > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={current <= 1}
            onClick={() => setPage(current - 1)}
            className="rounded border px-3 py-1 disabled:opacity-40 border-zinc-700"
          >
            Previous
          </button>
          <span className="text-xs text-zinc-500">
            Page {current} of {pageCount}
          </span>
          <button
            type="button"
            disabled={current >= pageCount}
            onClick={() => setPage(current + 1)}
            className="rounded border px-3 py-1 disabled:opacity-40 border-zinc-700"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
