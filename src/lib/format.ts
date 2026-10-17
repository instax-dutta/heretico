const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export function formatCompact(value: number): string {
  return compact.format(value);
}

export function formatPercent(value: number | null, digits = 1): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatKl(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  if (value === 0) return "0";
  if (value < 0.0001) return value.toExponential(1);
  if (value < 0.01) return value.toFixed(4);
  if (value < 1) return value.toFixed(3);
  return value.toFixed(2);
}

export function formatScore(value: number | null): string {
  if (value === null || Number.isNaN(value) || value <= 0) return "—";
  return value.toFixed(1);
}

export function formatDate(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().slice(0, 10);
}

export function formatParams(
  totalB: number | null,
  activeB: number | null,
  moe: boolean,
): string {
  if (totalB === null) return "—";
  const total = `${trimNumber(totalB)}B`;
  if (moe && activeB !== null) return `${total} · ${trimNumber(activeB)}B active`;
  return total;
}

export function trimNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}

/**
 * Origin and repo ids contain a slash and mixed case, but Netlify lowercases
 * every path it serves. Emitting the id verbatim means each model and repo URL
 * costs a 301 to the lowercase form and the canonical tag points at a
 * redirecting URL. Everything that builds a URL lowercases it, so the built
 * directory, the sitemap and the canonical all agree with what is served.
 * Lookups stay case-insensitive in `lib/dataset.ts`.
 */
function idPath(id: string): string {
  return id
    .split("/")
    .map((part) => encodeURIComponent(part).toLowerCase())
    .join("/");
}

export function huggingFaceUrl(repoId: string): string {
  return `https://huggingface.co/${repoId}`;
}

/** Origin ids contain a slash; keep it readable in URLs. */
export function originHref(id: string): string {
  return `/models/${idPath(id)}/`;
}

export function repoHref(id: string): string {
  return `/repo/${idPath(id)}/`;
}

export function familyHref(slug: string): string {
  return `/families/${slug}/`;
}
