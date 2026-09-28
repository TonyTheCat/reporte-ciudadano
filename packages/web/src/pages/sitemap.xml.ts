import { countPublishedReports, SITEMAP_PAGE } from "@rc/core/reports";
import type { APIRoute } from "astro";
import { config } from "../lib/server/config";

export const GET: APIRoute = async () => {
  const pages = Math.max(1, Math.ceil((await countPublishedReports()) / SITEMAP_PAGE));
  const maps = ["sitemap-static.xml", ...Array.from({ length: pages }, (_, i) => `sitemap-reports-${i}.xml`)];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${maps.map((m) => `  <sitemap><loc>${config.siteUrl}/${m}</loc></sitemap>`).join("\n")}
</sitemapindex>`;
  return new Response(body, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600, s-maxage=3600" } });
};
