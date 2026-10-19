import type { APIRoute } from "astro";
import { placesIndex } from "../../lib/server/buses";
import { handle } from "../../lib/server/http";

// Todas las paradas y lugares de una vez, igual para cualquiera: el teléfono busca la parada sin decirle al servidor
// qué buscó (ver /cuando-salgo). Cambian una vez por día como mucho.
export const GET: APIRoute = handle(async () => {
  const { body, etag } = await placesIndex();
  return new Response(body, {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=3600", ETag: etag },
  });
});
