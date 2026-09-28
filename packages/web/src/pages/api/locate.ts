import { locate } from "@rc/core/areas";
import type { APIRoute } from "astro";
import { error, handle, json } from "../../lib/server/http";

export const GET: APIRoute = handle(async (ctx) => {
  const lat = Number(ctx.url.searchParams.get("lat")), lng = Number(ctx.url.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return error(400, "validation", "Coordenadas inválidas.");
  const r = await locate(lat, lng);
  return json({ dept: r.dept?.name ?? null, district: r.district?.name ?? null, barrio: r.barrio?.name ?? null }, { cache: "public, max-age=3600" });
});
