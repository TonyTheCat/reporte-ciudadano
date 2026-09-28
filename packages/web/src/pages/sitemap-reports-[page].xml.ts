import { reportPath, sitemapReports } from "@rc/core/reports";
import type { APIRoute } from "astro";
import { config } from "../lib/server/config";

export const GET: APIRoute = async (ctx) => {
  const page = Number(ctx.params.page);
  if (!Number.isInteger(page) || page < 0) return new Response("No encontrado", { status: 404 });
  const rows = await sitemapReports(page);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows.map((r) => `  <url><loc>${config.siteUrl}${reportPath(r)}</loc><lastmod>${r.updated_at.toISOString()}</lastmod></url>`).join("\n")}
</urlset>`;
  return new Response(body, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600, s-maxage=3600" } });
};
