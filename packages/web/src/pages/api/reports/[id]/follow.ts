import { subscribe, unsubscribe } from "@rc/core/reports";
import type { APIRoute } from "astro";
import { error, handle, json } from "../../../../lib/server/http";

export const POST: APIRoute = handle(async (ctx) => {
  const u = ctx.locals.user;
  if (!u) return error(401, "login", "Iniciá sesión para seguir el caso.");
  await subscribe(ctx.params.id!, u.id, u.email);
  return json({ following: true });
});

export const DELETE: APIRoute = handle(async (ctx) => {
  const u = ctx.locals.user;
  if (!u) return error(401, "login", "Iniciá sesión.");
  await unsubscribe(ctx.params.id!, u.id);
  return json({ following: false });
});
