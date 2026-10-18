/**
 * The one place the canonical origin is written.
 *
 * It used to be a `?? "https://…"` literal in five files plus a hardcoded string
 * inside the social card, so changing the domain meant six edits and the card
 * could disagree with the metadata. This module is the single source.
 *
 * A wrong origin is invisible on the site itself: every page still renders, but
 * its canonical tag, the sitemap, robots.txt and the OG image all point
 * somewhere else. `scripts/verify/seo.mjs` asserts they agree.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://hdir.sdad.pro").replace(
  /\/+$/,
  "",
);

/** The same value without the scheme, for robots.txt `Host`. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
