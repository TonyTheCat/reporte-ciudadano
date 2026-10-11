import type { APIRoute } from "astro";
import { z } from "zod";
import { busRoute } from "../../../lib/server/buses";
import { error, handle, json } from "../../../lib/server/http";
import { nonEmptyParams } from "../../../lib/server/report-query";

// `company` y `route` vienen de /api/buses (companyCode y route de cada bus).
const querySchema = z.object({
  company: z.coerce.number().int().positive(),
  route: z.string().regex(/^[0-9a-f]{4}$/i),
});

export const GET: APIRoute = handle(async (ctx) => {
  const q = querySchema.parse(nonEmptyParams(ctx.url.searchParams));
  const route = await busRoute(q.company, q.route).catch((err: unknown) => {
    console.error(err);
    return undefined;
  });
  if (route === undefined) return error(502, "upstream", "No pudimos obtener el recorrido del colectivo.");
  if (!route) return error(404, "not_found", "No encontramos ese recorrido.");
  return json(route, { cache: "public, max-age=3600, s-maxage=3600" });
});
