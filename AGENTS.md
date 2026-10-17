# DOX framework

- DOX is highly performant AGENTS.md hierarchy installed here
- Agent must follow DOX instructions across any edits

## Core Contract

- AGENTS.md files are binding work contracts for their subtrees
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the nearest applicable AGENTS.md plus every parent AGENTS.md above it

## Read Before Editing

1. Read the root AGENTS.md
2. Identify every file or folder you expect to touch
3. Walk from the repository root to each target path
4. Read every AGENTS.md found along each route
5. If a parent AGENTS.md lists a child AGENTS.md whose scope contains the path, read that child and continue from there
6. Use the nearest AGENTS.md as the local contract and parent docs for repo-wide rules
7. If docs conflict, the closer doc controls local work details, but no child doc may weaken DOX

Do not rely on memory. Re-read the applicable DOX chain in the current session before editing.

## Update After Editing

Every meaningful change requires a DOX pass before the task is done.

Update the closest owning AGENTS.md when a change affects:

- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or artifacts
- user preferences about behavior, communication, process, organization, or quality
- AGENTS.md creation, deletion, move, rename, or index contents

Update parent docs when parent-level structure, ownership, workflow, or child index changes. Update child docs when parent changes alter local rules. Remove stale or contradictory text immediately. Small edits that do not change behavior or contracts may leave docs unchanged, but the DOX pass still must happen.

## Hierarchy

- Root AGENTS.md is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the top-level Child DOX Index
- Child AGENTS.md files own domain-specific instructions and their own Child DOX Index
- Each parent explains what its direct children cover and what stays owned by the parent
- The closer a doc is to the work, the more specific and practical it must be

## Child Doc Shape

- Create a child AGENTS.md when a folder becomes a durable boundary with its own purpose, rules, responsibilities, workflow, materials, or quality standards
- Work Guidance must reflect the current standards of the project or user instructions; if there are no specific standards or instructions yet, leave it empty
- Verification must reflect an existing check; if no verification framework exists yet, leave it empty and update it when one exists

Default section order:
- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child DOX Index

## Style

- Keep docs concise, current, and operational
- Document stable contracts, not diary entries
- Put broad rules in parent docs and concrete details in child docs
- Prefer direct bullets with explicit names
- Do not duplicate rules across many files unless each scope needs a local version
- Delete stale notes instead of explaining history
- Trim obvious statements, repeated rules, misplaced detail, and warnings for risks that no longer exist

## Closeout

1. Re-check changed paths against the DOX chain
2. Update nearest owning docs and any affected parents or children
3. Refresh every affected Child DOX Index
4. Remove stale or contradictory text
5. Run existing verification when relevant
6. Report any docs intentionally left unchanged and why

---

## Project: Heretic Directory

A static, human-facing directory of Heretic (abliterated) models on Hugging Face.
It resolves every repo to its canonical upstream model, groups artifacts into
ablation recipes, and ranks them by KL divergence and refusal rate.

### Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind v4
- Static export (`output: "export"`) deployed on Netlify; no server runtime, no API
- Data: `data/snapshot.json`, built offline by `scripts/crawl.ts` + `scripts/build-snapshot.ts`
- Tests: Vitest; gates: `GATES.md` + `scripts/verify/*.mjs`

### Rules

- Never invent a metric. If a model card does not publish KL and refusals, the
  artifact is unranked and marked as such.
- `data/snapshot.json` is the single source of truth for the site. Do not read
  Hugging Face at request time.
- Pure logic lives in `src/lib` and is unit-tested before use in pages.
- Client components may not import `src/lib/dataset.ts` (build-time fs access).
- Keep the site static-exportable: no route handlers, no server actions, no
  `searchParams` in server pages.
- `npm test`, `npx tsc --noEmit`, `npm run build` must pass before a commit.

### User Preferences

- Hosting is Netlify free tier.
- Humans only: no public JSON API or agent-facing surface beyond what the
  browser itself needs.
- Functional completeness comes first; visual design is a later phase.
- Commit small, atomic, revertible changes.

## Child DOX Index

- `src/AGENTS.md` — application and library source
- `src/app/AGENTS.md` — route tree and rendering constraints
- `src/components/AGENTS.md` — client/server component split
- `src/lib/AGENTS.md` — domain logic, scoring, query, snapshot
- `src/lib/parse/AGENTS.md` — model-card parsing
- `src/lib/ingest/AGENTS.md` — classification, origin resolution, recipes
- `scripts/AGENTS.md` — crawl, snapshot build, verification gates
- `tests/AGENTS.md` — TDD suites and fixtures
- `data/AGENTS.md` — committed snapshot and ignored crawl caches

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
