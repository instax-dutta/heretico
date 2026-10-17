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
- A GGUF-only publication whose parent is the original model is a direct
  conversion, not a quant. The card's direct-conversion evidence decides.
- Recipe id is a stable hash of `(origin, ablation author, KL, refusals, total,
  Heretic version)` so refreshes do not churn URLs.
- Artifacts without their own numbers inherit the recipe evidence with
  `confidence: "inherited"` and `sourceRepoId` pointing at the publisher.
- Metrics never average across artifacts; one published pair wins.

## Work Guidance

- Add a failing test for every new classification branch.
- Keep classification independent of scoring.
- Never guess an origin from a name when a declared parent exists.

## Verification

- `npx vitest run tests/ingest`
- `node scripts/verify/snapshot.mjs`
