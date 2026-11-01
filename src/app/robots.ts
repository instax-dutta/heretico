import type { MetadataRoute } from "next";
import { SITE_HOST, SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

/**
 * Crawl policy.
 *
 * The site is 487 MB and GitHub Pages allows a soft 100 GB/month of bandwidth,
 * which is about 200 full passes. A handful of crawlers walking every one of
 * the 5,366 URLs every day would spend that on their own, so the welcome is
 * deliberate rather than blanket:
 *
 * - Search engines are allowed, because they are how a newcomer finds the page.
 * - AI crawlers are allowed, because `llms.txt` exists specifically to be read
 *   by them. Blocking them here would contradict the point of that file.
 * - SEO and backlink scrapers are not: they cost a full pass and return
 *   nothing to a human reader.
 * - Bytespider is not: it is the one large crawler that does not honour
 *   robots.txt in practice, so it is named for the record.
 *
 * Crawl-delay is advisory and only some engines read it, but it costs nothing.
 */
const SEARCH_AND_AI = [
  "Googlebot",
  "Googlebot-Image",
  "Bingbot",
  "DuckDuckBot",
  "Applebot",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "PerplexityBot",
  "Google-Extended",
  "CCBot",
];

// Full-site crawlers that spend bandwidth without sending a reader.
const SCRAPERS = [
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "PetalBot",
  "Bytespider",
  "Amazonbot",
  "Diffbot",
  "DataForSeoBot",
  "BLEXBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: SCRAPERS, disallow: "/" },
      { userAgent: SEARCH_AND_AI, allow: "/" },
      { userAgent: "*", allow: "/", crawlDelay: 5 },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_HOST,
  };
}
