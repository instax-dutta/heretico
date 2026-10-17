import type { Metadata } from "next";
import Link from "next/link";
import { getSnapshot } from "@/lib/dataset";
import { familyHref, formatCompact } from "@/lib/format";

export const metadata: Metadata = {
  title: "Families",
  description:
    "Heretic conversions grouped by model family: Qwen, Gemma, Llama, Mistral, GPT-OSS and more, with the number of ranked conversions in each.",
  alternates: { canonical: "/families/" },
};

export default function FamiliesPage() {
  const snapshot = getSnapshot();
  const families = [...snapshot.families].sort(
    (a, b) => b.originCount - a.originCount || a.label.localeCompare(b.label),
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Families</h1>
        <p className="max-w-3xl text-zinc-400">
          A family groups generations of the same model line. Pick one to see every model in it
          with its best-ranked Heretic conversion.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {families.map((family) => (
          <Link
            key={family.slug}
            href={familyHref(family.slug)}
            className="rounded-lg border p-4 border-zinc-800 bg-zinc-950 hover:border-zinc-600"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium">{family.label}</span>
              <span className="text-xs text-zinc-500">{family.originCount} models</span>
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              {family.rankedRecipeCount} ranked conversions ·{" "}
              {formatCompact(family.downloadsAllTime)} downloads
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
