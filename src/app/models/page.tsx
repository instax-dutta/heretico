import type { Metadata } from "next";
import { ModelExplorer } from "@/components/ModelExplorer";
import { getSnapshot } from "@/lib/dataset";

export const metadata: Metadata = {
  title: "Models",
  description:
    "Every base model with a Heretic conversion, resolved to its canonical Hugging Face origin and showing the best-ranked abliteration for each.",
  alternates: { canonical: "/models/" },
};

export default function ModelsPage() {
  const snapshot = getSnapshot();
  const origins = [...snapshot.origins].sort(
    (a, b) => (b.bestScore ?? -1) - (a.bestScore ?? -1) || b.downloadsAllTime - a.downloadsAllTime,
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Models</h1>
        <p className="max-w-3xl text-zinc-400">
          Search for the model you already run. Every Heretic conversion, GGUF quant and
          derivative that descends from it is grouped under the same canonical model.
        </p>
      </header>
      <ModelExplorer
        initialOrigins={origins.slice(0, 100)}
        families={snapshot.families.map((family) => ({ slug: family.slug, label: family.label }))}
        total={origins.length}
      />
    </div>
  );
}
