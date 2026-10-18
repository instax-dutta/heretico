import type { MetadataRoute } from "next";
import { getMeasuredRepos, getSnapshot } from "@/lib/dataset";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

const BASE = SITE_URL;

export default function sitemap(): MetadataRoute.Sitemap {
  const snapshot = getSnapshot();
  const updated = new Date(snapshot.updatedAt);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: updated, priority: 1 },
    { url: `${BASE}/leaderboard/`, lastModified: updated, priority: 0.9 },
    { url: `${BASE}/models/`, lastModified: updated, priority: 0.9 },
    { url: `${BASE}/families/`, lastModified: updated, priority: 0.7 },
    { url: `${BASE}/methodology/`, lastModified: updated, priority: 0.4 },
  ];

  const origins: MetadataRoute.Sitemap = snapshot.origins.map((origin) => ({
    url: `${BASE}/models/${origin.id.toLowerCase()}/`,
    lastModified: new Date(origin.lastModified || snapshot.updatedAt),
    priority: 0.8,
  }));

  const families: MetadataRoute.Sitemap = snapshot.families.map((family) => ({
    url: `${BASE}/families/${family.slug}/`,
    lastModified: updated,
    priority: 0.6,
  }));

  const repos: MetadataRoute.Sitemap = getMeasuredRepos().map((repo) => ({
    url: `${BASE}/repo/${repo.id.toLowerCase()}/`,
    lastModified: new Date(repo.lastModified || snapshot.updatedAt),
    priority: 0.5,
  }));

  return [...staticEntries, ...origins, ...families, ...repos];
}
