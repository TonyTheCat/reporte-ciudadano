import type { APIRoute } from "astro";
import { config } from "../lib/server/config";

export const GET: APIRoute = () =>
  new Response(
    `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /auth/
Disallow: /mis-reportes
Disallow: /tiles/

Sitemap: ${config.siteUrl}/sitemap.xml
`,
    { headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=86400" } },
  );
