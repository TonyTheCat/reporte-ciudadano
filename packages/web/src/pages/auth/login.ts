import type { APIRoute } from "astro";
import { loginUrl } from "../../lib/server/auth";

// Con proveedor (Google) se va al Hosted UI; si no, a los formularios propios.
export const GET: APIRoute = (ctx) => {
  const next = ctx.url.searchParams.get("next");
  const provider = ctx.url.searchParams.get("provider");
  if (provider) return ctx.redirect(loginUrl(ctx.cookies, next, provider));
  return ctx.redirect(`/ingresar${next ? `?next=${encodeURIComponent(next)}` : ""}`);
};
