import { exportCSV, exportGeoJSON, type Scope } from "@rc/core/stats";
import type { APIContext, APIRoute } from "astro";
import { error, handle } from "../../../lib/server/http";
import { scopeFromQuery, scopeSchema, toScope } from "./_scope";

/** Datos abiertos: reportes publicados, sin datos personales. */
export const GET: APIRoute = handle(async (ctx) => respond(ctx, scopeFromQuery(ctx.url.searchParams)));

/** Exportación de un polígono dibujado en la consulta GIS. */
export const POST: APIRoute = handle(async (ctx) => respond(ctx, toScope(scopeSchema.parse(await ctx.request.json()))));

async function respond(ctx: APIContext, scope: Scope) {
  const stamp = new Date().toISOString().slice(0, 10);
  const headers = { "Cache-Control": "public, max-age=600, s-maxage=3600", "Access-Control-Allow-Origin": "*" };
  if (ctx.params.format === "geojson") {
    return new Response(JSON.stringify(await exportGeoJSON(scope)), {
      headers: { ...headers, "Content-Type": "application/geo+json", "Content-Disposition": `attachment; filename="reportes-${stamp}.geojson"` },
    });
  }
  if (ctx.params.format === "csv") {
    return new Response("﻿" + (await exportCSV(scope)), {
      headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="reportes-${stamp}.csv"` },
    });
  }
  return error(404, "not_found", "Formato no soportado.");
}
