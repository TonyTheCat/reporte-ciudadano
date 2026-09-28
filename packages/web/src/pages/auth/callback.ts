import type { APIRoute } from "astro";
import { handleCallback } from "../../lib/server/auth";

export const GET: APIRoute = async (ctx) => {
  const code = ctx.url.searchParams.get("code");
  const state = ctx.url.searchParams.get("state");
  if (!code || !state) return ctx.redirect("/?e=login");
  try {
    return ctx.redirect(await handleCallback(ctx.cookies, code, state));
  } catch (err) {
    console.error(err);
    return ctx.redirect("/?e=login");
  }
};
