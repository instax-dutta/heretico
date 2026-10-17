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
  applicationName: "Heretic Directory",
  // The generated file is emitted at a hashed path, which the metadata API
  // renders with a query string. A static host has no such file, so the shared
  // asset is declared by its stable path instead.
  openGraph: {
    type: "website",
    siteName: "Heretic Directory",
    url: siteUrl,
    title: "Every Heretic model, ranked",
    description:
      "By how little the weights drifted, and how few refusals remain. Metrics are self-reported by each publisher and never re-measured.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Heretic Directory: every Heretic model on Hugging Face, ranked by KL divergence and refusal rate.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Every Heretic model, ranked",
    description:
      "By how little the weights drifted, and how few refusals remain.",
    images: ["/og.png"],
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "192x192" }],
  },
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
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-zinc-950 text-zinc-100">
        <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3">
            <Link
              href="/"
              className="text-sm font-semibold tracking-tight text-zinc-100 transition-colors hover:text-white"
            >
              Heretic<span className="text-zinc-500"> Directory</span>
            </Link>
            <nav className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded text-zinc-400 underline-offset-4 transition-colors hover:text-zinc-100 hover:underline"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">{children}</main>

        <footer className="border-t border-zinc-800 px-4 py-8 text-xs leading-relaxed text-zinc-500">
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
