import { hotspots, summary, timeseries } from "@rc/core/stats";
import type { APIRoute } from "astro";
import { handle, json } from "../../../lib/server/http";
import { scopeFromQuery, scopeSchema, toScope } from "./_scope";

const CACHE = "public, max-age=60, s-maxage=300";

export const GET: APIRoute = handle(async (ctx) => {
  const scope = scopeFromQuery(ctx.url.searchParams);
  const [s, series, spots] = await Promise.all([summary(scope), timeseries(scope, 26), hotspots(scope)]);
  return json({ summary: s, timeseries: series, hotspots: spots }, { cache: CACHE });
});

/** Consulta con polígono dibujado (el GeoJSON no entra cómodo en la URL). */
export const POST: APIRoute = handle(async (ctx) => {
  const scope = toScope(scopeSchema.parse(await ctx.request.json()));
  const [s, series, spots] = await Promise.all([summary(scope), timeseries(scope, 26), hotspots(scope, 150, 2)]);
  return json({ summary: s, timeseries: series, hotspots: spots });
});
