import type { Metadata } from "next";
import { getSnapshot } from "@/lib/dataset";
import { formatCompact, formatDate } from "@/lib/format";
import { WEIGHTS } from "@/lib/scoring";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How the Heretic Directory ranks abliterated models: the score formula, Pareto frontiers, evidence confidence, what is excluded and where the numbers come from.",
  alternates: { canonical: "/methodology/" },
};

export default function MethodologyPage() {
  const snapshot = getSnapshot();

  return (
    <article className="flex max-w-3xl flex-col gap-8 text-sm leading-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Methodology</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          The directory answers one question: for a given base model, which Heretic conversion is
          the best trade-off between removing refusals and leaving the model unchanged? Everything
          below exists to answer that honestly.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">What gets ranked</h2>
        <p>
          One row is one <strong>ablation attempt</strong>, not one repository. A conversion
          published as BF16 plus six GGUF quants plus an FP8 build is a single recipe with several
          artifacts. Without this grouping, whichever author uploads the most quant files would
          dominate the leaderboard.
        </p>
        <p>
          Repositories are classified as a direct conversion, a quantized artifact, a finetune, a
          merge or a LoRA. A repository that merely has &ldquo;heretic&rdquo; in its name or tags but
          shows no provenance is indexed as unverified and never ranked.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">The score</h2>
        <p>Two published numbers are used, weighted equally:</p>
        <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 font-mono text-xs text-zinc-100">
{`rate      = refusals / refusal_total
retention = 1 / (1 + KL)
score     = 100 × (${WEIGHTS.refusals} × (1 − rate) + ${WEIGHTS.kl} × retention)`}
        </pre>
        <ul className="list-disc pl-5">
          <li>
            <strong>Refusals</strong> come from the publisher&apos;s harmful-prompt evaluation;
            fewer is better.
          </li>
          <li>
            <strong>KL divergence</strong> measures how far the abliterated model drifted from the
            original on harmless prompts; lower is better.
          </li>
          <li>
            <strong>1/(1+KL)</strong> is a hyperbolic retention term. It penalises drift smoothly,
            cannot explode, and keeps the score absolute — comparable across model sizes and
            refresh dates rather than only within a cohort.
          </li>
        </ul>
        <p className="text-zinc-600 dark:text-zinc-400">
          A perfect untouched model scores 100 (zero refusals is impossible in practice). A model
          with 3 refusals in 100 and KL 0.10 scores about 93.9. A model with no refusals but KL 2.0
          scores about 66.7: refusing nothing does not compensate for wrecking the weights.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Best pick and Pareto frontier</h2>
        <p>
          Within one base model, the <strong>Best</strong> badge goes to the highest score. The{" "}
          <strong>Pareto</strong> badge marks attempts that no other attempt beats on both KL and
          refusal rate at once. A Pareto point is often the interesting one for a specific use:
          for example, a version with 0% refusals at higher KL, or 20% refusals at almost no
          drift.
        </p>
        <p>
          Across models, rankings are only comparable as <em>conversion quality</em>, not model
          capability. Use the family and parameter filters to compare like with like.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Evidence confidence</h2>
        <ul className="list-disc pl-5">
          <li>
            <strong>Published</strong> — the model card states both KL and refusals for this
            ablation. Only these numbers are ranked.
          </li>
          <li>
            <strong>Inherited</strong> — a quant or derivative has no numbers of its own; it
            inherits its parent conversion&apos;s values and links to the source card.
          </li>
          <li>
            <strong>None</strong> — one or both numbers are missing, ambiguous, or appear only as
            quantization loss or a trial log. These artifacts are listed but not scored.
          </li>
        </ul>
        <p>
          Published benchmarks (MMLU, GSM8K, GPQA…) are copied only when a table explicitly
          attributes a column to the abliterated model. They are shown as evidence and never
          affect the score, because coverage is too sparse and the metrics too heterogeneous to
          rank fairly.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Where the data comes from</h2>
        <ol className="list-decimal pl-5">
          <li>
            Two discovery passes over the public Hugging Face Hub API: repositories carrying the{" "}
            <code>heretic</code> tag, then repositories named &ldquo;heretic&rdquo;. The sets are
            merged with the tagged pass taking precedence — the same method as{" "}
            <a
              className="underline"
              href="https://github.com/p-e-w/heretic/issues/450"
              rel="noreferrer"
              target="_blank"
            >
              p-e-w/heretic#450
            </a>
            .
          </li>
          <li>Each README is parsed for the base model, Heretic version, KL/refusal tables and benchmarks.</li>
          <li>
            Declared base models are walked upward until the first non-Heretic model. That
            terminal model is the canonical model; one GGUF quant of a quant of a conversion all
            resolve to it.
          </li>
          <li>
            Recipes are grouped and scored, then the snapshot is published. The crawl is
            incremental: unchanged READMEs (by repository SHA) are not fetched again.
          </li>
        </ol>
        <p className="text-zinc-600 dark:text-zinc-400">
          Snapshot: {formatCompact(snapshot.totals.repos)} repositories discovered,{" "}
          {formatCompact(snapshot.totals.verifiedRepos)} verified,{" "}
          {formatCompact(snapshot.totals.origins)} canonical models,{" "}
          {formatCompact(snapshot.totals.recipes)} measured conversions. Last refreshed{" "}
          {formatDate(snapshot.updatedAt)}.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Caveats</h2>
        <ul className="list-disc pl-5">
          <li>
            Metrics are <strong>self-reported</strong>. The directory does not run evaluations, so
            a mislabelled card produces a mislabelled row. Every row links to the exact snippet
            that was parsed.
          </li>
          <li>
            Heretic&apos;s refusal counter is a keyword heuristic and is known to over-count
            compliance wrapped in a disclaimer. Treat refusal rates as comparable to each other,
            not as an absolute measure of compliance.
          </li>
          <li>
            KL values are hardware- and library-dependent. Small differences (0.01) are not
            meaningful; order-of-magnitude differences are.
          </li>
          <li>
            Download counts are the Hub&apos;s counters and can be inflated by pulls, mirrors and
            quantization pipelines. They break ties, they do not outrank metrics.
          </li>
          <li>
            Model names change fast. If a family is missing, the fallback groups it under the
            first meaningful token; it will still be searchable by its exact name.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 text-xs dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold">Independence</h2>
        <p className="text-zinc-500">
          This is an independent index. It is not operated or endorsed by the Heretic maintainers.
          Heretic is free software by p-e-w; this site only reads public Hub metadata and model
          cards.
        </p>
      </section>
    </article>
  );
}
