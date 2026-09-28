import type { APIRoute } from "astro";
import { loginUrl } from "../../lib/server/auth";

export const GET: APIRoute = (ctx) =>
  ctx.redirect(loginUrl(ctx.cookies, ctx.url.searchParams.get("next"), ctx.url.searchParams.get("provider") ?? undefined));
