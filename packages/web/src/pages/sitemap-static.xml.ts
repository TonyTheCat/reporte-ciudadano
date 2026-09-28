import { listChildren, listDepartments } from "@rc/core/areas";
import { listCategories } from "@rc/core/categories";
import type { APIRoute } from "astro";
import { config } from "../lib/server/config";

export const GET: APIRoute = async () => {
  const urls = ["/", "/reportar", "/estadisticas", "/py", "/datos-abiertos", "/acerca", "/privacidad", "/terminos"];
  for (const c of await listCategories()) urls.push(`/categoria/${c.slug}`);
  for (const d of await listDepartments()) {
    urls.push(`/py/${d.slug}`);
    for (const di of await listChildren(d.id)) urls.push(`/py/${d.slug}/${di.slug}`);
  }
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${config.siteUrl}${u}</loc></url>`).join("\n")}
</urlset>`;
  return new Response(body, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
};
