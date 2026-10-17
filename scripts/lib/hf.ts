/**
 * Minimal Hugging Face Hub client for the crawler.
 *
 * Discovery follows p-e-w/heretic#450: one pass for the `heretic` tag, one for
 * "heretic" in the name, merged with the tagged pass taking precedence.
 * Everything else comes from the same list response via `expand[]`, so the
 * only per-repo request is the README.
 */

const HF = "https://huggingface.co";

export const DISCOVERY_EXPANDS = [
  "tags",
  "downloads",
  "downloadsAllTime",
  "likes",
  "gated",
  "pipeline_tag",
  "cardData",
  "baseModels",
  "safetensors",
  "createdAt",
  "lastModified",
  "sha",
  "siblings",
  "library_name",
];

export interface HFModel {
  id: string;
  sha?: string;
  createdAt?: string;
  lastModified?: string;
  downloads?: number;
  downloadsAllTime?: number;
  likes?: number;
  gated?: boolean | string;
  pipeline_tag?: string | null;
  library_name?: string | null;
  tags?: string[];
  siblings?: { rfilename: string }[];
  safetensors?: { total?: number } | null;
  cardData?: Record<string, unknown> | null;
  baseModels?: { relation?: string; models?: { id: string }[] } | null;
}

export interface HFRawModel extends HFModel {
  /** Which discovery pass found it first. */
  discoveredBy: "tag" | "name";
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface RequestOptions {
  token?: string;
  retries?: number;
  onRetry?: (url: string, attempt: number, status: number) => void;
}

export async function hfFetch(url: string, options: RequestOptions = {}): Promise<Response> {
  const retries = options.retries ?? 4;
  const headers: Record<string, string> = { "User-Agent": "heretic-directory-crawler" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url, { headers });
      // 404: no README. 401/403: gated or private repo — index the metadata we
      // already have, but never fail the whole crawl over one wall.
      if (response.status === 404 || response.status === 401 || response.status === 403) {
        return response;
      }
      if (response.status === 429 || response.status >= 500) {
        options.onRetry?.(url, attempt + 1, response.status);
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        await sleep(retryAfter > 0 ? retryAfter * 1000 : 1000 * 3 ** attempt);
        continue;
      }
      if (!response.ok) throw new Error(`HF ${response.status} for ${url}`);
      return response;
    } catch (error) {
      lastError = error;
      options.onRetry?.(url, attempt + 1, 0);
      await sleep(1000 * 2 ** attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${url}`);
}

function expandQuery(expands: string[]): string {
  return expands.map((e) => `expand[]=${encodeURIComponent(e)}`).join("&");
}

export interface ListOptions extends RequestOptions {
  /** Safety cap on pages; a page is 1000 models. */
  maxPages?: number;
  onPage?: (count: number, url: string) => void;
}

export async function listAllModels(
  query: Record<string, string>,
  options: ListOptions = {},
): Promise<HFModel[]> {
  const out: HFModel[] = [];
  const seen = new Set<string>();
  const maxPages = options.maxPages ?? 40;
  let url: string | null =
    `${HF}/api/models?` +
    new URLSearchParams({
      ...query,
      limit: "1000",
      direction: "-1",
      sort: "downloads",
    }).toString() +
    `&${expandQuery(DISCOVERY_EXPANDS)}`;

  for (let page = 0; page < maxPages && url; page += 1) {
    const response = await hfFetch(url, options);
    if (response.status === 404) break;
    const batch = (await response.json()) as HFModel[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const model of batch) {
      if (!model.id || seen.has(model.id)) continue;
      seen.add(model.id);
      out.push(model);
    }
    options.onPage?.(out.length, url);

    const link = response.headers.get("link") ?? "";
    const next = link.match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1] : null;
  }

  return out;
}

export interface Discovery {
  tagged: HFModel[];
  named: HFModel[];
  merged: HFRawModel[];
}

/** Two-pass discovery with tagged precedence, as in p-e-w/heretic#450. */
export async function discoverHereticModels(
  options: ListOptions = {},
): Promise<Discovery> {
  const tagged = await listAllModels({ filter: "heretic" }, options);
  const taggedIds = new Set(tagged.map((m) => m.id));
  const named = await listAllModels({ search: "heretic" }, options);

  const merged: HFRawModel[] = [];
  for (const model of tagged) merged.push({ ...model, discoveredBy: "tag" });
  for (const model of named) {
    if (taggedIds.has(model.id)) continue;
    merged.push({ ...model, discoveredBy: "name" });
  }

  return { tagged, named, merged };
}

export function toRawRepo(model: HFRawModel) {
  const cardData = model.cardData ?? {};
  const cardBase = cardData.base_model;
  const declared = [
    ...((model.baseModels?.models ?? []).map((m) => m.id) ?? []),
    ...(typeof cardBase === "string" ? [cardBase] : Array.isArray(cardBase)
      ? cardBase.filter((v): v is string => typeof v === "string")
      : []),
  ];

  const files = (model.siblings ?? []).map((s) => s.rfilename);

  return {
    id: model.id,
    author: model.id.split("/")[0] ?? "unknown",
    sha: model.sha ?? "",
    createdAt: model.createdAt ?? "",
    lastModified: model.lastModified ?? "",
    downloads30d: model.downloads ?? 0,
    downloadsAllTime: model.downloadsAllTime ?? 0,
    likes: model.likes ?? 0,
    tags: model.tags ?? [],
    gated: Boolean(model.gated),
    pipelineTag: model.pipeline_tag ?? null,
    libraryName: model.library_name ?? null,
    declaredBaseModels: [...new Set(declared)],
    cardBaseModel: typeof cardBase === "string" ? cardBase : null,
    cardQuantizedBy:
      typeof cardData.quantized_by === "string" ? cardData.quantized_by : null,
    safetensorsTotal: model.safetensors?.total ?? null,
    files,
    license: typeof cardData.license === "string" ? cardData.license : null,
  };
}

export type RawRepoLike = ReturnType<typeof toRawRepo>;

/** README text, trying the two common casings. */
export async function fetchReadme(id: string, options: RequestOptions = {}): Promise<string | null> {
  for (const name of ["README.md", "readme.md"]) {
    const response = await hfFetch(`${HF}/${id}/raw/main/${name}`, options);
    if (response.ok) {
      const text = await response.text();
      // HF serves an HTML error page with a 200 in some edge cases.
      if (text.trimStart().startsWith("<!doctype html")) continue;
      return text;
    }
  }
  return null;
}
