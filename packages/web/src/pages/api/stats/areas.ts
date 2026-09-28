import { areasGeoJSON } from "@rc/core/areas";
import { countsByArea } from "@rc/core/stats";
import type { APIRoute } from "astro";
import { handle, json } from "../../../lib/server/http";
import { scopeFromQuery } from "./_scope";

/** GeoJSON de departamentos (o distritos de un departamento) con conteos, para el coroplético. */
export const GET: APIRoute = handle(async (ctx) => {
  const level = ctx.url.searchParams.get("level") === "2" ? 2 : 1;
  const scope = scopeFromQuery(ctx.url.searchParams);
  const [fc, counts] = await Promise.all([areasGeoJSON(level, level === 2 ? scope.deptId : undefined), countsByArea(level, scope)]);
  const byId = new Map(counts.map((c) => [c.area_id, c]));
  for (const f of (fc as any).features) {
    const c = byId.get(f.properties.id);
    Object.assign(f.properties, { total: c?.total ?? 0, open: c?.open ?? 0, resolved: c?.resolved ?? 0 });
  }
  return json(fc, { cache: "public, max-age=300, s-maxage=600" });
});
