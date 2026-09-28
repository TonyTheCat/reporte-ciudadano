import { findNearbyDuplicates, reportPath } from "@rc/core/reports";
import type { APIRoute } from "astro";
import { error, handle, json } from "../../../lib/server/http";

export const GET: APIRoute = handle(async (ctx) => {
  const p = ctx.url.searchParams;
  const lat = Number(p.get("lat")), lng = Number(p.get("lng")), category = p.get("category");
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !category) return error(400, "validation", "Faltan parámetros.");
  const rows = await findNearbyDuplicates(lat, lng, category, 40);
  return json(rows.map((r) => ({
    id: r.id, code: r.public_code, path: reportPath(r), title: r.title, status: r.status,
    distance_m: r.distance_m, confirmations: r.confirmations_count, cover: r.cover_url, created_at: r.created_at,
  })));
});
