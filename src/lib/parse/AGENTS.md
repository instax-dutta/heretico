# src/lib/parse

## Purpose

Turn a free-form Hugging Face model card into structured provenance and metrics.

## Ownership

- `markdown.ts` — table/fence-aware Markdown helpers
- `card.ts` — base model, Heretic version, KL/refusals, benchmarks, kind hints

## Local Contracts

- Parser output always carries `confidence` and the exact matched `evidence`.
  A number without a trustworthy label match is not a metric.
- Card confidence tops out at `medium`. Layout quality is not truth: a tidy
  table and a scrawled sentence are equally self-reported. Corroboration past
  one card is `Recipe.verification`, computed in `lib/ingest`.
- Fenced code blocks are never searched: trial logs contain many plausible pairs.
- Quantization KL figures (`IQ3_S 0.051`, `imatrix`) are not ablation metrics.
- Baseline columns are identified from headers, not position: cards publish both
  `This model | Original` and `Original | This model`.
- `refusalTotal` defaults to 100 only when the card omits a denominator for a
  bare count; otherwise the record stays unranked.
- Benchmarks require an explicit "this model"/"abliterated" column. Tables that
  compare several base models are skipped rather than misattributed.
- Base-model links are ordered by appearance and include the immediate parent
  first (quants point at the conversion, which points at the original).

## Work Guidance

- Every parser change needs a real-card fixture in `tests/fixtures/cards/`.
- Do not "fix" fixture cards; their mess is the regression surface.
- Prefer adding a rejection rule over making a match more permissive.

## Verification

- `npx vitest run tests/parse`
- Corpus sanity (optional): run the parser over a cached card corpus and confirm
  zero throws and no drop in high-confidence coverage.
