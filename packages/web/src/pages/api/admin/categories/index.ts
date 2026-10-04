import { createCategory } from "@rc/core/categories";
import type { APIRoute } from "astro";
import { error, handle, json, requireStaff } from "../../../../lib/server/http";

export const POST: APIRoute = handle(async (ctx) => {
  const actor = requireStaff(ctx);
  if (actor.role !== "admin") return error(403, "forbidden", "Solo administradores.");
  return json(await createCategory(await ctx.request.json()), { status: 201 });
});
