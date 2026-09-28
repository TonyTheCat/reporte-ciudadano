import type { APIRoute } from "astro";
import { logout } from "../../lib/server/auth";

export const GET: APIRoute = (ctx) => ctx.redirect(logout(ctx.cookies));
