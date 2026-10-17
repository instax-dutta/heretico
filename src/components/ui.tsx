import Link from "next/link";
import type { ReactNode } from "react";
import { formatScore } from "@/lib/format";
import type { Verification } from "@/lib/types";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 ${className}`}>
      {children}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      {hint ? <span className="text-xs text-zinc-500">{hint}</span> : null}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  title,
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "accent";
  title?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400",
    good: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
    warn: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
    accent: "border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300",
  };
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium leading-4 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function scoreTone(score: number): "good" | "neutral" | "warn" {
  if (score >= 95) return "good";
  if (score >= 85) return "neutral";
  return "warn";
}

export function ScorePill({ score }: { score: number }) {
  return <Badge tone={scoreTone(score)}>{formatScore(score)}</Badge>;
}

/**
 * Shown when nothing corroborates a recipe beyond its own model card: the
 * evidence repo does not ship weights, or reports a KL no abliteration produces.
 */
export function VerificationBadge({ verification }: { verification: Verification }) {
  if (verification !== "unverified") return null;
  return (
    <Badge tone="warn" title="No corroboration beyond this card: the repository does not publish model weights, or its KL is below what an abliteration can produce. The numbers may still be correct.">
      unverified
    </Badge>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-zinc-500">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1">
          {index > 0 ? <span aria-hidden>›</span> : null}
          {item.href ? (
            <Link className="hover:underline" href={item.href}>
              {item.label}
            </Link>
          ) : (
            <span className="text-zinc-700 dark:text-zinc-300">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
