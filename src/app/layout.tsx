import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://heretico.sdad.pro";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Heretic Directory — every Heretic model, ranked",
    template: "%s · Heretic Directory",
  },
  description:
    "Find the best Heretic (abliterated) version of any open model. Ranked by KL divergence and refusal rate, filtered by family, size and format.",
  openGraph: {
    type: "website",
    siteName: "Heretic Directory",
    url: siteUrl,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

const NAV = [
  { href: "/leaderboard/", label: "Leaderboard" },
  { href: "/models/", label: "Models" },
  { href: "/families/", label: "Families" },
  { href: "/methodology/", label: "Methodology" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              Heretic<span className="text-zinc-400"> Directory</span>
            </Link>
            <nav className="flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-zinc-900 dark:hover:text-zinc-100">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

        <footer className="border-t border-zinc-200 bg-white px-4 py-6 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto flex max-w-6xl flex-col gap-2">
            <p>
              An independent, unaffiliated index of models produced with{" "}
              <a
                className="underline"
                href="https://github.com/p-e-w/heretic"
                rel="noreferrer"
                target="_blank"
              >
                Heretic
              </a>
              . Metrics are taken from the publishers&apos; own model cards and are never invented.
            </p>
            <p>
              <Link className="underline" href="/methodology/">
                How the ranking works
              </Link>{" "}
              · data from the public Hugging Face Hub.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
