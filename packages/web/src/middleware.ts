import { defineMiddleware } from "astro:middleware";
import { getUser } from "./lib/server/auth";
import { config } from "./lib/server/config";

// Rutas cacheables públicamente: no se lee la sesión para que CloudFront pueda compartirlas.
const PUBLIC_CACHEABLE = [/^\/tiles\//, /^\/sitemap/, /^\/robots\.txt$/, /^\/api\/stats\//, /^\/api\/categories/];

/**
 * CSRF: las escrituras de la API solo aceptan JSON (un formulario de otro sitio no puede enviarlo sin
 * preflight CORS, que no habilitamos) y, si viene Origin, debe ser el propio sitio.
 */
function isCrossSiteWrite(req: Request, url: URL): boolean {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return false;
  if (!(req.headers.get("content-type") ?? "").startsWith("application/json")) return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = new URL(origin).host;
  return host !== url.host && host !== new URL(config.siteUrl).host;
}

export const onRequest = defineMiddleware(async (ctx, next) => {
  const path = ctx.url.pathname;
  if (path.startsWith("/api/") && isCrossSiteWrite(ctx.request, ctx.url)) {
    return new Response(JSON.stringify({ error: { code: "forbidden", message: "Solicitud no permitida." } }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!PUBLIC_CACHEABLE.some((r) => r.test(path))) {
    ctx.locals.user = await getUser(ctx.cookies).catch(() => undefined);
  }
  if (path.startsWith("/admin") && !ctx.locals.user?.isStaff) {
    return ctx.redirect(ctx.locals.user ? "/?e=permisos" : `/auth/login?next=${encodeURIComponent(path)}`);
  }
  const res = await next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "geolocation=(self), camera=(self)");
  if (ctx.locals.user && !res.headers.has("Cache-Control")) res.headers.set("Cache-Control", "private, no-store");
  return res;
});
