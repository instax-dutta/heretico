# Gates: Heretic Directory (functional phase)

OWNS: src/**, scripts/**, tests/**, data/**, public/**, package.json, PLAN.md, README.md, AGENTS.md, GATES.md, next.config.ts, tsconfig.json, vitest.config.ts, eslint.config.mjs, .github/**

Scope: A working, tested static directory of Heretic models — crawl → parse → classify → score → snapshot → prerendered pages with browser-side filtering — verified against real Hugging Face data and deployable to Netlify. Visual design and any API surface are out of scope.

- [ ] G1: The codebase typechecks and lints without errors
  CHECK: node scripts/verify/static.mjs
  EXPECT: STATIC CHECKS PASSED
  EVIDENCE: pending

- [ ] G2: Card parsing extracts base model, Heretic version, KL and refusals from the committed real-world fixtures
  CHECK: node scripts/verify/suite.mjs tests/parse
  EXPECT: SUITE PASSED tests/parse
  EVIDENCE: pending

- [ ] G3: Ingestion classifies repos, resolves canonical origins, groups recipes and propagates inherited metrics correctly
  CHECK: node scripts/verify/suite.mjs tests/ingest
  EXPECT: SUITE PASSED tests/ingest
  EVIDENCE: pending

- [ ] G4: Scoring, Pareto frontiers, best picks and rank ties behave as specified
  CHECK: node scripts/verify/suite.mjs tests/scoring
  EXPECT: SUITE PASSED tests/scoring
  EVIDENCE: pending

- [ ] G5: Filtering, sorting, search and pagination return correct result sets and stable pages
  CHECK: node scripts/verify/suite.mjs tests/query
  EXPECT: SUITE PASSED tests/query
  EVIDENCE: pending

- [ ] G6: The committed snapshot is schema-valid, internally consistent and covers real data at the required depth
  CHECK: node scripts/verify/snapshot.mjs
  EXPECT: SNAPSHOT VERIFIED
  EVIDENCE: pending

- [ ] G7: A production static export serves every functional route with real snapshot content
  CHECK: node scripts/verify/app-smoke.mjs
  EXPECT: APP SMOKE PASSED
  EVIDENCE: pending

- [ ] G8: SEO surfaces (metadata, sitemap, robots) are generated from the snapshot and every sitemap URL resolves
  CHECK: node scripts/verify/seo.mjs
  EXPECT: SEO SURFACES VERIFIED
  EVIDENCE: pending

- [ ] G9: Freshness automation is wired: incremental crawl skips unchanged repos and the scheduled workflow rebuilds and validates the snapshot
  CHECK: node scripts/verify/automation.mjs
  EXPECT: AUTOMATION VERIFIED
  EVIDENCE: pending

- [ ] G10: The DOX tree documents every durable boundary and is internally consistent
  CHECK: node scripts/verify/dox.mjs
  EXPECT: DOX VERIFIED
  EVIDENCE: pending

- [ ] G11: The top-20 rows of the real leaderboard were read against their source cards and rank order is plausible
  EVIDENCE: pending
