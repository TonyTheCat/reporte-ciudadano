import { setCategoryWindow } from "@rc/core/categories";
import type { APIRoute } from "astro";
import { z } from "zod";
import { error, handle, json, requireStaff } from "../../../../lib/server/http";

const date = z.iso.datetime({ offset: true }).or(z.iso.date()).nullable();

export const POST: APIRoute = handle(async (ctx) => {
  const actor = requireStaff(ctx);
  if (actor.role !== "admin") return error(403, "forbidden", "Solo administradores.");
  const body = z.object({ from: date, to: date }).parse(await ctx.request.json());
  await setCategoryWindow(ctx.params.slug!, body.from ? new Date(body.from) : null, body.to ? new Date(body.to) : null);
  return json({ ok: true });
});
