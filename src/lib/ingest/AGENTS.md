# src/lib/ingest

## Purpose

Decide what each repository is, which canonical model it descends from, and
which ablation attempt its numbers belong to.

## Ownership

- `classify.ts` — `heretic | quant | finetune | merge | lora | unknown`, origin walk
- `recipes.ts` — ablation grouping, inherited metrics, Pareto/best pick, recipe ids

## Local Contracts

- `unknown` is a real outcome. A repo tagged "heretic" without provenance is
  indexed but never ranked.
- Origin resolution follows the first declared parent recursively; a repo whose
  parent is not indexed stops at that parent. Cycles mark every member unverified.
- Parent lookup is case-insensitive and every origin id is folded onto one
  spelling (preferring the indexed one) before anything groups by it. Without
  this, `gemma-4-12B-it` and `gemma-4-12b-it` become two origin pages and split
  a cohort, which duplicates best picks and corrupts Pareto flags. The recipe
  group's own parent walk must fold case the same way `classify.ts` does, or an
  artifact drops out of its recipe.
- A GGUF-only publication whose parent is the original model is a direct
  conversion, not a quant. The card's direct-conversion evidence decides.
- Recipe id is a stable hash of `(origin, KL, refusals, total, Heretic version)`
  so refreshes do not churn URLs. The author is deliberately excluded: the same
  ablation re-uploaded by another account is one recipe, with both artifact sets
  merged into it.
- Artifacts without their own numbers inherit the recipe evidence with
  `confidence: "inherited"` and `sourceRepoId` pointing at the publisher. An
  artifact that published its own pair keeps its own confidence and **no**
  `sourceRepoId`: relabelling it would make `/repo/` cite a source that reports
  different numbers.
- A verified artifact with no ablation ancestor stands in as its own ablation,
  so its published numbers still reach the leaderboard. The signature merge then
  folds it into a parent's recipe when it copied that recipe's numbers. Without
  this, ~400 measured artifacts were on a model page and on no leaderboard row.
- Metrics never average across artifacts; one published pair wins.
- `verification` is computed here, from the evidence repo alone: real weight
  metadata (`safetensorsTotal > 0`) plus a KL at or above `KL_FLOOR`. Nothing
  corroborates a card by itself, so an uncorroborated recipe never wins a
  cohort. Downloads are not part of it; the Hub counters are inflatable.

## Work Guidance

- Add a failing test for every new classification branch.
- Keep classification independent of scoring.
- Never guess an origin from a name when a declared parent exists.

## Verification

- `npx vitest run tests/ingest`
- `node scripts/verify/snapshot.mjs`
