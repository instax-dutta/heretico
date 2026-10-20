/**
 * Plain-language definitions for the terms this site uses.
 *
 * The pages are written for people who already know what an ablation is. This
 * panel is the one place that says what every word means, so a term is never
 * only ever explained by a table header. Kept a server component: it is pure
 * markup and must be safe in both trees.
 */

export interface GlossaryEntry {
  term: string;
  meaning: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: "Abliteration (a Heretic model)",
    meaning:
      "Removing a model's refusal behaviour by editing its weights. The refusals go away, but the weights move a little too, and that movement can cost quality. That trade-off is the thing this site ranks.",
  },
  {
    term: "KL divergence",
    meaning:
      "How far the edited weights moved from the original, measured on harmless prompts. Zero means untouched. Lower is better.",
  },
  {
    term: "Refusals",
    meaning:
      "How many of a set of harmful prompts the model still refuses. The publisher runs that test and reports the number; this site never re-runs it.",
  },
  {
    term: "Score",
    meaning:
      "KL and refusals, combined and weighted equally, out of 100. Higher is better. It rates how clean the edit was, not how capable the model is.",
  },
  {
    term: "Base model",
    meaning:
      "The original, unedited model a conversion was made from. This is the name to search for.",
  },
  {
    term: "Conversion (a recipe)",
    meaning:
      "One attempt at removing refusals. It is often published as several files, and all of them share one row.",
  },
  {
    term: "Artifact",
    meaning:
      "A single downloadable file set: the weights, a GGUF quant, an FP8 build.",
  },
  {
    term: "Verified",
    meaning:
      "The repository that published these numbers also ships real model weights, and its KL is one an abliteration can physically produce. Uploading weights costs gigabytes, which an invented card does not.",
  },
  {
    term: "Unverified",
    meaning:
      "Nothing beyond the model card backs these numbers. They still rank, but they can never come first.",
  },
  {
    term: "Inherited",
    meaning:
      "This file set published no numbers of its own and shows the ones from the conversion it was made from.",
  },
  {
    term: "Best",
    meaning:
      "The highest-scoring verified conversion of this model. Usually the one you want.",
  },
  {
    term: "Pareto",
    meaning:
      "Nothing else beats this one on both KL and refusals at the same time. Often the interesting pick when you want zero refusals, or the least possible damage.",
  },
  {
    term: "Params",
    meaning: "Model size in billions of parameters. 4B means about four billion.",
  },
];

export function Glossary({
  title = "What do these words mean?",
  entries = GLOSSARY,
}: {
  title?: string;
  entries?: GlossaryEntry[];
}) {
  return (
    <details className="group rounded-lg border border-zinc-800 bg-zinc-950">
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-zinc-200 hover:text-zinc-50">
        {title}
        <span className="ml-2 text-xs font-normal text-zinc-500 group-open:hidden">
          {entries.length} terms
        </span>
      </summary>
      <dl className="flex flex-col gap-3 border-t border-zinc-900 px-5 py-4 text-sm leading-6">
        {entries.map((entry) => (
          <div key={entry.term} className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
            <dt className="shrink-0 font-medium text-zinc-200 sm:w-56">{entry.term}</dt>
            <dd className="text-zinc-400">{entry.meaning}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
