import { clearHome, getHome, setHome } from "@rc/core/users";
import type { APIRoute } from "astro";
import { z } from "zod";
import { error, handle, json } from "../../../lib/server/http";

const toJson = (a: { id: number; name: string; parent_id: number | null; bbox: number[] }) =>
  ({ id: a.id, name: a.name, deptId: a.parent_id, bbox: a.bbox });

export const GET: APIRoute = handle(async (ctx) => {
  const u = ctx.locals.user;
  if (!u) return error(401, "login", "Iniciá sesión.");
  const home = await getHome(u.id);
  return json(home ? { ...toJson(home.area), source: home.source } : null);
});

export const PUT: APIRoute = handle(async (ctx) => {
  const u = ctx.locals.user;
  if (!u) return error(401, "login", "Iniciá sesión para guardar tu ciudad.");
  const { districtId } = z.object({ districtId: z.number().int().positive() }).parse(await ctx.request.json());
  return json({ ...toJson(await setHome(u.id, districtId)), source: "elegida" });
});

export const DELETE: APIRoute = handle(async (ctx) => {
  const u = ctx.locals.user;
  if (!u) return error(401, "login", "Iniciá sesión.");
  await clearHome(u.id);
  return json(null);
});
