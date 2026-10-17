import type { ParsedCard } from "../../src/lib/types";

/**
 * Bump when parser semantics change. Cached markdown is re-parsed locally, so a
 * parser fix never needs a network round trip.
 */
export const PARSER_VERSION = 2;

export interface CardCacheEntry {
  sha: string;
  parserVersion?: number;
  /** Raw card text; the source for re-parsing after a parser change. */
  markdown?: string | null;
  card?: ParsedCard | null;
}

export interface CardLoaderResult {
  card: ParsedCard | null;
  /** True when the README was fetched from the network. */
  fetched: boolean;
  entry: CardCacheEntry;
}

/**
 * Decide whether a repository's README must be fetched.
 *
 * - unchanged sha + current parser: reuse the parse
 * - unchanged sha + stale parser: re-parse cached markdown (no request)
 * - changed sha or no cache: fetch
 */
export async function loadCard(
  repo: { id: string; sha: string },
  cached: CardCacheEntry | null,
  fetchMarkdown: (id: string) => Promise<string | null>,
  parse: (markdown: string, options: { selfId: string }) => ParsedCard,
): Promise<CardLoaderResult> {
  if (cached && cached.sha === repo.sha) {
    if (cached.parserVersion === PARSER_VERSION && cached.card !== undefined) {
      return { card: cached.card, fetched: false, entry: cached };
    }
    if (cached.markdown !== undefined) {
      const card = cached.markdown ? parse(cached.markdown, { selfId: repo.id }) : null;
      return {
        card,
        fetched: false,
        entry: {
          sha: repo.sha,
          parserVersion: PARSER_VERSION,
          markdown: cached.markdown,
          card,
        },
      };
    }
  }

  const markdown = await fetchMarkdown(repo.id);
  const card = markdown ? parse(markdown, { selfId: repo.id }) : null;
  return {
    card,
    fetched: true,
    entry: { sha: repo.sha, parserVersion: PARSER_VERSION, markdown, card },
  };
}
