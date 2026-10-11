/**
 * Recorridos de los colectivos, guardados en la base. El VMT tarda segundos en armar los de una empresa y
 * cambian muy de vez en cuando, así que se traen una vez por día (Lambda BusRoutesSync) y el mapa los lee de acá.
 */
import { sql } from "./db";
import { vmt, type VmtCompany, type VmtItinerary } from "./vmt";

// Los recorridos de una empresa grande pesan cientos de KB y el prototipo llega a tardar más de 15 s en armarlos.
const ITINERARIES_TIMEOUT_MS = 60_000;

export interface BusRoute {
  type: "Feature";
  geometry: { type: "MultiLineString"; coordinates: [number, number][][] };
  properties: { line: string; direction: string; from: string; to: string };
}

/**
 * Reemplaza los recorridos guardados por los del VMT. Las empresas se piden de a una para no cargar al prototipo.
 * Una empresa que falla, o que vuelve sin recorridos, conserva los que ya tenía; una que el VMT ya no lista se borra.
 */
export async function syncBusRoutes(): Promise<{ routes: number; failed: number[] }> {
  const codes = (await vmt<VmtCompany>("/empresas")).map((c) => c.cod_catalogo);
  const fetched = new Map<number, VmtItinerary[]>();
  const failed: number[] = [];
  for (const code of codes) {
    try {
      const itineraries = await vmt<VmtItinerary>(`/itinerarios?cod_catalogo=${code}`, ITINERARIES_TIMEOUT_MS);
      if (itineraries.length) fetched.set(code, itineraries);
    } catch (err) {
      console.error(err);
      failed.push(code);
    }
  }
  if (!fetched.size) throw new Error(`VMT: no llegó ningún recorrido de las ${codes.length} empresas`);

  await sql().begin(async (tx) => {
    await tx`DELETE FROM bus_routes WHERE company_code NOT IN ${tx(codes)}`;
    for (const [code, itineraries] of fetched) {
      await tx`DELETE FROM bus_routes WHERE company_code = ${code}`;
      // Solo lo que se guarda: el VMT manda además la vigencia, observaciones, etc.
      const rows = itineraries.map(({ ruta_hex, ruta_linea, sentido, origen, destino, geojson }) => ({ ruta_hex, ruta_linea, sentido, origen, destino, geojson }));
      // Si el VMT repite un ruta_hex en la misma empresa queda el primero.
      await tx`
        INSERT INTO bus_routes (company_code, route_hex, line, direction, origin, destination, geom)
        SELECT ${code}, lower(r.ruta_hex), r.ruta_linea, r.sentido, r.origen, r.destino,
          ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(r.geojson), 4326))
        FROM jsonb_to_recordset(${tx.json(rows)})
          AS r(ruta_hex text, ruta_linea text, sentido text, origen text, destino text, geojson text)
        ON CONFLICT DO NOTHING`;
    }
  });
  const routes = [...fetched.values()].reduce((n, list) => n + list.length, 0);
  return { routes, failed };
}

/** Carga los recorridos solo si la tabla está vacía (primer deploy). */
export async function syncBusRoutesIfEmpty(): Promise<boolean> {
  const [{ n }] = await sql()<{ n: number }[]>`SELECT count(*)::int AS n FROM bus_routes`;
  if (n > 0) return false;
  await syncBusRoutes();
  return true;
}

/** Recorrido de un bus: su `route` es el `ruta_hex` de uno de los itinerarios de su empresa. */
export async function getBusRoute(companyCode: number, route: string): Promise<BusRoute | null> {
  const [row] = await sql()<{ geometry: BusRoute["geometry"]; line: string; direction: string; origin: string; destination: string }[]>`
    SELECT ST_AsGeoJSON(geom, 6)::json AS geometry, line, direction, origin, destination
    FROM bus_routes WHERE company_code = ${companyCode} AND route_hex = ${route.toLowerCase()}`;
  if (!row) return null;
  return {
    type: "Feature",
    geometry: row.geometry,
    properties: { line: row.line, direction: row.direction, from: row.origin, to: row.destination },
  };
}
