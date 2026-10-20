import type { ParsedCard, RawRepo, RepoKind } from "../types";

export interface RepoInput {
  repo: RawRepo;
  card: ParsedCard | null;
}

export interface Classification {
  kind: RepoKind;
  /** Declared immediate parents, most specific first. */
  parents: string[];
  /** Canonical upstream model (never a Heretic conversion when resolvable). */
  originId: string | null;
  verified: boolean;
  evidence: string;
}

const HERETIC_NAME = /(heretic|abliterat|uncensor|decensor|de-censor)/i;
const QUANT_NAME = /(gguf|mlx|fp8|nvfp4|mxfp4|awq|gptq|exl[23]|int4|bnb|quant)/i;

export function baseIdsFor(input: RepoInput): string[] {
  const ids = [
    ...(input.card?.baseModelIds ?? []),
    ...input.repo.declaredBaseModels,
    ...(input.repo.cardBaseModel ? [input.repo.cardBaseModel] : []),
  ];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = raw.trim().replace(/\/+$/, "");
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(id)) continue;
    if (id.toLowerCase() === input.repo.id.toLowerCase()) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function nameLooksHereic(id: string): boolean {
  return HERETIC_NAME.test(id.split("/").pop() ?? id);
}

/**
 * Classify every repo and resolve each to its canonical origin.
 *
 * Resolution is recursive because a GGUF quant points at a Heretic repo, which
 * points at the original model; only the terminal repo is the origin. Cycles
 * (authors sometimes set base_model to themselves) are broken and recorded.
 */
export function classifyRepos(inputs: RepoInput[]): Map<string, Classification> {
  const byId = new Map(inputs.map((input) => [input.repo.id, input]));
  const results = new Map<string, Classification>();
  const resolving = new Set<string>();
  const cyclic = new Set<string>();

  /** Repo ids are case-sensitive on the Hub but authors type parents freely. */
  const indexedByLower = new Map<string, string>();
  for (const input of inputs) {
    const key = input.repo.id.toLowerCase();
    if (!indexedByLower.has(key)) indexedByLower.set(key, input.repo.id);
  }
  function inputFor(id: string): RepoInput | undefined {
    return byId.get(id) ?? byId.get(indexedByLower.get(id.toLowerCase()) ?? "");
  }

  function resolve(id: string): Classification {
    const cached = results.get(id);
    if (cached) return cached;

    const input = byId.get(id);
    if (!input) {
      return {
        kind: "unknown",
        parents: [],
        originId: null,
        verified: false,
        evidence: "not indexed",
      };
    }

    if (resolving.has(id)) {
      // Only the repos actually *on* the cycle are untrustworthy. `resolving` is
      // the whole chain currently being walked, and a repo that merely points
      // into a cycle is not part of it: marking the entire stack silently
      // dropped that repo's whole subtree from the index.
      const chain = [...resolving];
      for (const pending of chain.slice(chain.indexOf(id))) cyclic.add(pending);
      const cycle: Classification = {
        kind: "unknown",
        parents: [],
        originId: null,
        verified: false,
        evidence: "base-model cycle",
      };
      return cycle;
    }
    resolving.add(id);

    const parents = baseIdsFor(input);
    const primaryParent = parents[0] ?? null;
    const parentInput = primaryParent ? inputFor(primaryParent) : undefined;
    const parentClassification = parentInput;
    const parentResolved = parentInput ? resolve(parentInput.repo.id) : null;

    const parentIsHeretic =
      parents.some(nameLooksHereic) || Boolean(parentResolved && parentResolved.kind !== "unknown");

    const formats = input.repo.files.some((f) => f.toLowerCase().endsWith(".gguf"))
      ? "gguf"
      : "";
    const quantSignals =
      Boolean(input.card?.quantizedBy) ||
      QUANT_NAME.test(input.repo.id.split("/").pop() ?? "") ||
      formats === "gguf" ||
      input.repo.tags.some((t) => ["gguf", "mlx", "awq", "gptq", "exl2", "exl3"].includes(t.toLowerCase()));

    let kind: RepoKind = "unknown";
    let evidence = "no Heretic provenance in the card";

    const kindHint = input.card?.kindHint ?? null;

    if (parentIsHeretic && kindHint && kindHint !== "quant") {
      kind = kindHint;
      evidence = `card identifies this as a ${kindHint} of a Heretic model`;
    } else if (parentIsHeretic && quantSignals) {
      kind = "quant";
      evidence = "quantized artifact of a Heretic model";
    } else if (input.card?.isHereticConversion) {
      kind = "heretic";
      evidence = "card states the weights were abliterated with Heretic";
    } else if (parentIsHeretic) {
      kind = "finetune";
      evidence = "derivative of a Heretic model without its own ablation evidence";
    } else if (quantSignals && input.card?.referencesHereticProject) {
      kind = "quant";
      evidence = "quantized artifact referencing the Heretic project";
    }

    // A verified repo whose parent is unknown stops there: the parent is the
    // best canonical origin we can name without guessing.
    let originId: string | null = null;
    if (primaryParent) {
      if (!parentClassification) originId = primaryParent;
      else if (parentResolved!.originId) originId = parentResolved!.originId;
      else originId = primaryParent;
    }

    const classification: Classification = cyclic.has(id)
      ? {
          kind: "unknown" as const,
          parents,
          originId: null,
          verified: false,
          evidence: "base-model cycle",
        }
      : {
          kind,
          parents,
          originId,
          verified: kind !== "unknown",
          evidence,
        };
    resolving.delete(id);
    results.set(id, classification);
    return classification;
  }

  for (const input of inputs) resolve(input.repo.id);
  canonicalizeOrigins(results, inputs);
  return results;
}

/**
 * One spelling per upstream model.
 *
 * Base ids come from free-text cards, so "google/gemma-4-12B-it" and
 * "google/gemma-4-12b-it" both appear. Left alone they split one model into two
 * origin pages (and half the leaderboard cohorts), so every origin id is folded
 * onto a single spelling before anything downstream groups by it.
 */
function canonicalizeOrigins(
  results: Map<string, Classification>,
  inputs: RepoInput[],
): void {
  const indexed = new Set(inputs.map((input) => input.repo.id));
  const variants = new Map<string, Map<string, number>>();
  for (const classification of results.values()) {
    if (!classification.originId) continue;
    const key = classification.originId.toLowerCase();
    const counts = variants.get(key) ?? new Map<string, number>();
    counts.set(classification.originId, (counts.get(classification.originId) ?? 0) + 1);
    variants.set(key, counts);
  }

  const canonical = new Map<string, string>();
  for (const [key, counts] of variants) {
    const ranked = [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
    // Prefer a spelling we actually indexed: its Hub metadata feeds the page.
    canonical.set(key, (ranked.find(([id]) => indexed.has(id)) ?? ranked[0])[0]);
  }

  for (const classification of results.values()) {
    if (!classification.originId) continue;
    classification.originId =
      canonical.get(classification.originId.toLowerCase()) ?? classification.originId;
  }
}
