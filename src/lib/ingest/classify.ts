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
      // Every repo on the current stack is part of the cycle; none of them can
      // claim a trustworthy origin.
      for (const pending of resolving) cyclic.add(pending);
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
    const parentClassification = primaryParent ? byId.get(primaryParent) : undefined;
    const parentResolved = parentClassification ? resolve(primaryParent!) : null;

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
  return results;
}

/** True when a repo id looks like a Heretic conversion rather than an upstream model. */
export function isHereticName(id: string): boolean {
  return nameLooksHereic(id);
}
