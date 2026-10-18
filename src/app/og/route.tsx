import { ImageResponse } from "next/og";
import { SITE_HOST } from "@/lib/site";

export const dynamic = "force-static";
export const contentType = "image/png";

/**
 * The social card, generated from the snapshot so it can never advertise
 * numbers the site has moved past.
 *
 * This is a route handler rather than the `opengraph-image` file convention:
 * that convention emits its URL with a cache-busting query string, which
 * resolves to no file on a static host, so every share 404s its image. A route
 * handler emits a plain file that `scripts/build-og.ts` moves to /og.png.
 */
export async function GET() {
  const { getSnapshot } = await import("@/lib/dataset");
  const snapshot = getSnapshot();
  const n = (value: number) => value.toLocaleString("en-US");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#09090b",
          color: "#f4f4f5",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ width: 92, height: 14, borderRadius: 7, background: "#3f3f46" }} />
              <div style={{ width: 58, height: 14, borderRadius: 7, background: "#71717a" }} />
              <div style={{ width: 20, height: 14, borderRadius: 7, background: "#34d399" }} />
            </div>
            <div style={{ display: "flex", fontSize: 30, color: "#71717a" }}>
              <span style={{ color: "#f4f4f5", fontWeight: 600 }}>Heretic</span>
              <span>{" Directory"}</span>
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 600, letterSpacing: "-0.035em" }}>
            Every Heretic model, ranked
          </div>
          <div style={{ display: "flex", fontSize: 31, color: "#a1a1aa" }}>
            By how little the weights drifted, and how few refusals remain
          </div>
        </div>

        <div style={{ display: "flex", gap: 56, borderTop: "1px solid #27272a", paddingTop: 32 }}>
          {[
            [n(snapshot.totals.origins), "base models"],
            [n(snapshot.totals.rankedRecipes), "measured ablations"],
            [n(snapshot.totals.verifiedRepos), "repositories"],
          ].map(([value, label]) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 46, fontWeight: 600, letterSpacing: "-0.03em" }}>{value}</div>
              <div style={{ fontSize: 23, color: "#71717a" }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 21, color: "#52525b" }}>
          <span>Metrics are self-reported by each publisher and never re-measured.</span>
          <span style={{ color: "#34d399" }}>{SITE_HOST}</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
