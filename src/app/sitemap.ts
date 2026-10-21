import type { MetadataRoute } from "next";

import { indexableRoutes } from "@/config/site";
import { loadBookableSizeSlugs } from "@/lib/home/dumpster-inventory";
import { getSiteUrl } from "@/lib/site-url";

// Picks up size pages for sizes added in the admin (e.g. /dumpsters/30-yard).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();

  let sizeRoutes: string[] = [];
  try {
    sizeRoutes = (await loadBookableSizeSlugs()).map((slug) => `/dumpsters/${slug}`);
  } catch {
    // Database unreachable: the static routes still make a valid sitemap.
  }

  const routes = [...new Set<string>([...indexableRoutes, ...sizeRoutes])];
  return routes.map((path) => ({
    url: new URL(path, baseUrl).toString(),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
