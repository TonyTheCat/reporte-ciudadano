import type { APIRoute } from "astro";
import { getBusRoute } from "@rc/core/bus-routes";
import { z } from "zod";
import { error, handle, json } from "../../../lib/server/http";
import { nonEmptyParams } from "../../../lib/server/report-query";

// `company` y `route` vienen de /api/buses (companyCode y route de cada bus).
const querySchema = z.object({
  company: z.coerce.number().int().positive(),
  route: z.string().regex(/^[0-9a-f]{4}$/i),
});

export const GET: APIRoute = handle(async (ctx) => {
  const q = querySchema.parse(nonEmptyParams(ctx.url.searchParams));
  const route = await getBusRoute(q.company, q.route);
  // El VMT no publica el recorrido de todos los route_id que reportan sus buses.
  if (!route) return error(404, "not_found", "No encontramos ese recorrido.");
  return json(route, { cache: "public, max-age=3600, s-maxage=3600" });
});
