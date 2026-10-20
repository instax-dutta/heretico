# Gates: Heretic Directory (functional phase)

OWNS: src/**, scripts/**, tests/**, data/**, public/**, package.json, PLAN.md, README.md, AGENTS.md, GATES.md, next.config.ts, tsconfig.json, vitest.config.ts, eslint.config.mjs, .github/**

Scope: A working, tested static directory of Heretic models — crawl → parse → classify → score → snapshot → prerendered pages with browser-side filtering — verified against real Hugging Face data and deployable to Netlify. Visual design and any API surface are out of scope.

- [x] G1: The codebase typechecks and lints without errors
  CHECK: node scripts/verify/static.mjs
  EXPECT: STATIC CHECKS PASSED
  EVIDENCE: `STATIC CHECKS PASSED` (next typegen + tsc --noEmit + eslint, 0 errors); re-run from a fresh clone of the public repo, where `.next/` does not exist yet

- [x] G2: Card parsing extracts base model, Heretic version, KL and refusals from the committed real-world fixtures
  CHECK: node scripts/verify/suite.mjs tests/parse
  EXPECT: SUITE PASSED tests/parse
  EVIDENCE: `SUITE PASSED tests/parse` — 21 tests over committed cards (table, column-oriented, bullet, prose, range and quant-noise cases). Card confidence now tops out at `medium`: layout quality is not truth, so corroboration past one card moved to `Recipe.verification`

- [x] G3: Ingestion classifies repos, resolves canonical origins, groups recipes and propagates inherited metrics correctly
  CHECK: node scripts/verify/suite.mjs tests/ingest
  EXPECT: SUITE PASSED tests/ingest
  EVIDENCE: `SUITE PASSED tests/ingest` — 33 tests, including the verified/unverified split, the KL floor, and merge-time verification; includes case-variant origin folding (regression for the duplicate-origin/duplicate-best-pick bug), case-folded parent lookup in recipe grouping, an artifact keeping its own published confidence instead of being relabelled `inherited`, and a measured artifact with no indexed ablation ancestor still reaching the leaderboard

- [x] G4: Scoring, Pareto frontiers, best picks and rank ties behave as specified
  CHECK: node scripts/verify/suite.mjs tests/scoring
  EXPECT: SUITE PASSED tests/scoring
  EVIDENCE: `SUITE PASSED tests/scoring` — 12 tests, including that a fabricated zero-KL/zero-refusal card cannot take rank 1 and that a cohort with nothing verified elects no best pick

- [x] G5: Filtering, sorting, search and pagination return correct result sets and stable pages
  CHECK: node scripts/verify/suite.mjs tests/query
  EXPECT: SUITE PASSED tests/query
  EVIDENCE: `SUITE PASSED tests/query` — 12 tests, including that no sort direction can place an unverified row first

- [x] G6: The committed snapshot is schema-valid, internally consistent and covers real data at the required depth
  CHECK: node scripts/verify/snapshot.mjs
  EXPECT: SNAPSHOT VERIFIED
  EVIDENCE: `SNAPSHOT VERIFIED` — the current counts are the generated block at the top of `README.md`; the invariants below are what the gate re-derives from the published rows. Pareto/best-pick recomputed from published rows, every `inherited` pair matches the repo it cites, every verified artifact that published its own metrics is on a leaderboard row, no unverified recipe holds a best pick, every recipe's numbers match the repo it cites as evidence, no physically impossible refusal or KL value is published, and coverage has not fallen more than 4% against the committed snapshot (a crawl hitting HTTP 429 otherwise publishes a quietly smaller index)

- [x] G7: A production static export serves every functional route with real snapshot content
  CHECK: node scripts/verify/app-smoke.mjs
  EXPECT: APP SMOKE PASSED
  EVIDENCE: `APP SMOKE PASSED` — 10 routes checked against the export, 1046 model pages + 3869 repo pages prerendered; the model index renders 50 rows per page and each model artifact table caps at 50 rows. Export is 466 MB / 26,002 files, down from 637 MB / 37,582

- [x] G8: SEO surfaces (metadata, sitemap, robots) are generated from the snapshot and every sitemap URL resolves
  CHECK: node scripts/verify/seo.mjs
  EXPECT: SEO SURFACES VERIFIED
  EVIDENCE: `SEO SURFACES VERIFIED` — 5189 sitemap URLs all resolve, unique titles on sampled pages. `/repo/` is generated only for the 3872 artifacts that published metrics. `og:image` and every icon resolve to a real file with no query string, and no Next.js template asset ships. Every generated path is lowercase because Netlify lowercases what it serves: a mixed-case directory is only reachable through a 301, and the canonical tag pointed at a redirecting URL. Model pages carry JSON-LD `Dataset` records with `dateModified`, and `public/llms.txt` is generated from the snapshot

- [x] G9: Freshness automation is wired: incremental crawl skips unchanged repos and the scheduled workflow rebuilds and validates the snapshot
  CHECK: node scripts/verify/automation.mjs
  EXPECT: AUTOMATION VERIFIED
  EVIDENCE: `AUTOMATION VERIFIED` — workflow (schedule, push-triggered gates, tests, static checks, crawl, snapshot, verify, build, app-smoke, change-guarded commit with a non-fatal push, staleness and freshness alerts, README cache), netlify.toml (out/, npm run build, cache headers), 4 incremental-cache tests

- [x] G10: The DOX tree documents every durable boundary and is internally consistent
  CHECK: node scripts/verify/dox.mjs
  EXPECT: DOX VERIFIED
  EVIDENCE: `DOX VERIFIED` — 10 AGENTS.md documents checked, plus README.md assertions that the documented commands, gate and deploy config still exist, and LICENSE present, MIT and linked from the README

- [x] G11: The top-20 rows of the real leaderboard were read against their source cards and rank order is plausible
  EVIDENCE: read the top 20 rows of `data/snapshot.json` and fetched 9 of their live cards. Verbatim matches: ThalisAI/Qwen3-32B-heretic (0/100, KL 0.0000), krthkyadtya/Qwen2.5-72B-Instruct-heretic (0/66, 0.0035), anasali4151/llama3.1-heretic-unsensored (0/100, 0.0082), trohrbaugh/ZAYA1-74B-preview-heretic-ara (0/100, 0.0095), grayarea/Magidonia-24B-v4.3-heretic-v1.2 (0/108, 0.0229), Echo9Zulu/Nanbeige4.1-3B-Heretic (0.0003), trohrbaugh/gemma-4-E4B-it-heretic-ara (0.0126), sunkencity/Llama-xLAM-2-8b-fc-r-blasphemer (KL 0.00, 2/100), 0bserverx/Qwen3.8-27B-Heretic-Abliterated-Uncensored-GGUF (row "RVN (this repo)" 0–1/100, 0.0085 — a range is read as its worst case and reported as 1/100). Both card layouts are handled: heretic-first columns (anasali4151) and original-first columns (krthkyadtya). Rank order tracks the metric: rank 1–20 sit at KL ≤ 0.023 and refusal rate ≤ 0.02, and the worst rows (e.g. TheDrummer/Behemoth-123B-v1.1) are the high-KL/high-refusal ones. The single card claiming both zero KL and zero refusals (Qwen/Qwen3-32B) is flagged `implausible` and labelled in the table rather than silently ranked first.
