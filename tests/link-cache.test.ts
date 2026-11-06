import { describe, expect, it } from "vitest";
import { freshStatus, LINK_TTL_MS, type LinkCache } from "../scripts/lib/link-cache";

const now = Date.parse("2026-11-06T00:00:00.000Z");
const at = (daysAgo: number) => new Date(now - daysAgo * 86_400_000).toISOString();

describe("freshStatus", () => {
  it("returns a status checked within the TTL", () => {
    const cache: LinkCache = { "a/b": { status: "ok", checkedAt: at(1) } };
    expect(freshStatus(cache, "a/b", now)).toBe("ok");
  });

  it("expires a status older than the TTL", () => {
    const cache: LinkCache = {
      "a/b": { status: "ok", checkedAt: at(LINK_TTL_MS / 86_400_000 + 1) },
    };
    expect(freshStatus(cache, "a/b", now)).toBeNull();
  });

  it("carries gated and dead answers, and ignores an unknown id", () => {
    const cache: LinkCache = {
      "a/b": { status: "gated", checkedAt: at(0) },
      "a/c": { status: "dead", checkedAt: at(0) },
    };
    expect(freshStatus(cache, "a/b", now)).toBe("gated");
    expect(freshStatus(cache, "a/c", now)).toBe("dead");
    expect(freshStatus(cache, "a/missing", now)).toBeNull();
  });

  it("treats an unparsable timestamp as stale", () => {
    const cache: LinkCache = { "a/b": { status: "ok", checkedAt: "not a date" } };
    expect(freshStatus(cache, "a/b", now)).toBeNull();
  });
});
