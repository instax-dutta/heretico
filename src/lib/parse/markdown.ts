/**
 * Small, dependency-free Markdown helpers for reading model cards.
 * Only what the parser needs: tables, fenced-code awareness, cell cleanup and
 * the handful of number shapes Heretic authors actually publish.
 */

export interface Table {
  headers: string[];
  rows: string[][];
  /** 1-based line number of the header row, for evidence snippets. */
  line: number;
}

/** Remove HTML tags, emphasis markers, emoji and entity noise from a cell. */
export function stripCell(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[\u2705\u274c\u2714\u2716\ufe0f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => stripCell(cell));
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-{2,}:?$/.test(cell.replace(/\s/g, "")));
}

function isTableLine(line: string): boolean {
  return line.trim().startsWith("|") && line.trim().endsWith("|") && line.trim().length > 2;
}

/** Parse pipe tables, ignoring anything inside fenced code blocks. */
export function parseTables(markdown: string): Table[] {
  const lines = markdown.split(/\r?\n/);
  const tables: Table[] = [];
  let fence: string | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const fenceMatch = line.match(/^\s*(```+|~~~+)/);
    if (fenceMatch) {
      if (fence === null) fence = fenceMatch[1][0];
      else if (fenceMatch[1][0] === fence) fence = null;
      continue;
    }
    if (fence !== null) continue;

    if (!isTableLine(line)) continue;
    if (i + 1 >= lines.length || !isTableLine(lines[i + 1])) continue;

    const headers = splitRow(line);
    const separator = splitRow(lines[i + 1]);
    if (!isSeparatorRow(separator)) continue;

    const rows: string[][] = [];
    let j = i + 2;
    for (; j < lines.length && isTableLine(lines[j]); j += 1) {
      rows.push(splitRow(lines[j]));
    }
    tables.push({ headers, rows, line: i + 1 });
    i = j - 1;
  }

  return tables;
}

/** First number in a cell, tolerating `0.16`, `**0.0801**`, `82.01%`, `±`. */
export function parseNumber(cell: string | undefined): number | null {
  if (!cell) return null;
  const match = stripCell(cell).match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

/** `3/100`, `3 out of 100`, `3` (no denominator). */
export function parseRefusal(cell: string | undefined): { count: number; total: number | null } | null {
  if (!cell) return null;
  const text = stripCell(cell);
  const fraction = text.match(/(-?\d+)\s*(?:\/|out\s+of)\s*(\d+)/i);
  if (fraction) {
    const count = Number(fraction[1]);
    const total = Number(fraction[2]);
    if (Number.isFinite(count) && Number.isFinite(total) && total > 0) {
      return { count, total };
    }
    return null;
  }
  const single = text.match(/^\s*(-?\d+)\s*$/);
  if (single) return { count: Number(single[1]), total: null };
  return null;
}

/** Remove fenced code blocks so trial logs never win a metric search. */
export function stripCodeFences(markdown: string): string {
  return markdown.replace(/^[ \t]*(```+|~~~+)[^\n]*\n[\s\S]*?^[ \t]*\1[^\n]*$/gm, "");
}

export interface NumberedLine {
  line: number;
  text: string;
}

/** Lines with their 1-based numbers, outside fenced code blocks. */
export function proseLines(markdown: string): NumberedLine[] {
  const out: NumberedLine[] = [];
  let fence: string | null = null;
  markdown.split(/\r?\n/).forEach((text, index) => {
    const match = text.match(/^\s*(```+|~~~+)/);
    if (match) {
      if (fence === null) fence = match[1][0];
      else if (match[1][0] === fence) fence = null;
      return;
    }
    if (fence === null) out.push({ line: index + 1, text });
  });
  return out;
}
