/**
 * Paradas y lugares conocidos para buscar la parada por nombre en ¿Cuándo salgo? (ver place-search.ts). Se juntan
 * dos fuentes, una vez por día con los recorridos (Lambda BusRoutesSync):
 *
 * - **Paradas del VMT** (`/paradas?id_itinerario=N`): nombre y ubicación de cada parada de cada recorrido. Pedidas
 *   por empresa vienen cortadas en 200, por eso se piden por recorrido (~50 ms cada una).
 * - **Lugares de OpenStreetMap** (Overpass): shoppings, bancos, hospitales, universidades, plazas, etc., con sus
 *   otros nombres (`alt_name`, `short_name`, ...). Así se encuentra la parada buscando "Shopping del Sol" o "BCP".
 *
 * Si una fuente falla, quedan sus lugares del día anterior.
 */
import { createHash } from "node:crypto";
import type { ItinerariesSnapshot } from "./bus-routes";
import { sql } from "./db";
import { normSearch, type PlaceKind, type PlaceRow, type PlacesFile } from "./place-search";
import { vmtTry } from "./vmt";

const STOPS_TIMEOUT_MS = 20_000;
const CONCURRENCY = 4;
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const OVERPASS_TIMEOUT_MS = 180_000;
// Overpass rechaza seguido por carga (429, 504): se espera y se reintenta una vez.
const OVERPASS_RETRY_MS = 30_000;
// Gran Asunción, con margen: sur, oeste, norte, este.
const BBOX = "-25.55,-57.75,-25.15,-57.35";
// Paradas con el mismo nombre a menos de esto (~30 m) son la misma: el VMT la repite en cada recorrido que pasa.
const SAME_STOP_DEG = 0.0003;
// Un nombre de parada que aparece en más lugares que esto es el de la ruta ("Ruta Nacional Mariscal Estigarribia"),
// no el de una parada: no sirve para encontrarla.
const MAX_STOPS_PER_NAME = 6;
// Nombres que el VMT pone cuando la parada no tiene uno.
const GENERIC_STOP = /^(bus stop|parada|parada de omnibus|parada de bus|parada de colectivo|\d+)$/;

interface VmtStop { id: number; id_itinerario: number; nombre: string | null; latitud: number; longitud: number }

// Etiquetas de OSM que se buscan, y el tipo de lugar que es cada una.
const OSM_KINDS: [key: string, value: string, kind: PlaceKind][] = [
  ["shop", "mall", "mall"], ["shop", "supermarket", "supermarket"], ["shop", "department_store", "store"],
  ["amenity", "bank", "bank"], ["amenity", "hospital", "hospital"], ["amenity", "clinic", "clinic"],
  ["amenity", "university", "university"], ["amenity", "college", "university"], ["amenity", "school", "school"],
  ["amenity", "marketplace", "market"], ["amenity", "place_of_worship", "church"], ["amenity", "townhall", "townhall"],
  ["amenity", "police", "police"], ["amenity", "bus_station", "terminal"], ["amenity", "courthouse", "court"],
  ["amenity", "library", "library"], ["amenity", "theatre", "theatre"], ["amenity", "cinema", "cinema"],
  ["leisure", "park", "park"], ["leisure", "stadium", "stadium"], ["tourism", "museum", "museum"],
  ["tourism", "attraction", "attraction"], ["office", "government", "government"],
];
const ALT_NAME_TAGS = ["alt_name", "short_name", "official_name", "old_name", "brand"];

interface OsmElement { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

export function overpassQuery(): string {
  const byKey = new Map<string, string[]>();
  for (const [k, v] of OSM_KINDS) byKey.set(k, [...(byKey.get(k) ?? []), v]);
  const parts = [...byKey].map(([k, vs]) => `nwr["name"]["${k}"~"^(${vs.join("|")})$"](${BBOX});`);
  return `[out:json][timeout:170];(${parts.join("")});out center tags;`;
}

function osmKind(tags: Record<string, string>): PlaceKind | undefined {
  return OSM_KINDS.find(([k, v]) => tags[k] === v)?.[2];
}

/** Paradas de los recorridos del día, con los itinerarios que ya trajo syncBusRoutes. */
export async function syncStops(snapshot: ItinerariesSnapshot, opts: { deadline?: number } = {}): Promise<{ stops: number; failed: number }> {
  const ids = snapshot.companies.flatMap((c) => (c.itineraries ?? []) as { id_itinerario?: number; vigente?: boolean | null }[])
    .filter((i) => typeof i.id_itinerario === "number" && i.vigente !== false)
    .map((i) => i.id_itinerario!);
  const queue = [...new Set(ids)];
  const total = queue.length;
  // Por id: el VMT repite la misma parada en cada recorrido que pasa por ahí.
  const rows = new Map<string, { source_id: string; name: string; lng: number; lat: number }>();
  let failed = 0;
  async function worker() {
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      if (opts.deadline && Date.now() > opts.deadline) {
        failed++;
        continue;
      }
      const r = await vmtTry<VmtStop>(`/paradas?id_itinerario=${id}`, STOPS_TIMEOUT_MS);
      if (!r.data) {
        failed++;
        continue;
      }
      for (const s of r.data) {
        const name = s.nombre?.trim();
        if (!name || GENERIC_STOP.test(normSearch(name)) || !Number.isFinite(s.latitud) || !Number.isFinite(s.longitud)) continue;
        rows.set(String(s.id), { source_id: String(s.id), name, lng: s.longitud, lat: s.latitud });
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  // Con la mitad de los recorridos sin paradas, se conservan las del día anterior.
  if (!rows.size || failed > total / 2) throw new Error(`VMT: paradas de ${failed} de ${total} recorridos sin respuesta`);
  await replace("vmt", [...rows.values()].map((r) => ({ ...r, kind: "stop" as const, alt: [] as string[] })));
  return { stops: rows.size, failed };
}

async function overpass(deadline?: number): Promise<OsmElement[]> {
  // Con límite (la Lambda de los recorridos), Overpass se corta antes para que quede tiempo de guardar.
  const timeoutMs = deadline ? Math.min(OVERPASS_TIMEOUT_MS, deadline - Date.now()) : OVERPASS_TIMEOUT_MS;
  if (timeoutMs <= 0) throw new Error("Overpass: no queda tiempo antes del límite");
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    body: new URLSearchParams({ data: overpassQuery() }),
    // Overpass rechaza pedidos sin User-Agent (406).
    headers: { "User-Agent": "reporte-ciudadano (github.com/marcosferr/reporte-ciudadano)" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Overpass: HTTP ${res.status}`);
  return ((await res.json()) as { elements: OsmElement[] }).elements;
}

/** Lugares conocidos de OpenStreetMap. */
export async function syncLandmarks({ retryMs = OVERPASS_RETRY_MS, deadline }: { retryMs?: number; deadline?: number } = {}): Promise<{ landmarks: number }> {
  const elements = await overpass(deadline).catch(async (err: unknown) => {
    if (deadline && Date.now() + retryMs >= deadline) throw err;
    console.warn("Overpass, se reintenta", err);
    await new Promise((r) => setTimeout(r, retryMs));
    return overpass(deadline);
  });
  const rows = elements.flatMap((e) => {
    const tags = e.tags ?? {};
    const kind = osmKind(tags);
    const lat = e.lat ?? e.center?.lat, lng = e.lon ?? e.center?.lon;
    if (!kind || !tags.name || lat === undefined || lng === undefined) return [];
    const alt = [...new Set(ALT_NAME_TAGS.map((t) => tags[t]).filter((v): v is string => !!v && v !== tags.name))];
    return [{ source_id: `${e.type}/${e.id}`, name: tags.name, kind, lng, lat, alt }];
  });
  if (!rows.length) throw new Error("Overpass: no llegó ningún lugar");
  await replace("osm", rows);
  return { landmarks: rows.length };
}

async function replace(source: string, rows: { source_id: string; name: string; kind: PlaceKind; lng: number; lat: number; alt: string[] }[]) {
  await sql().begin(async (tx) => {
    await tx`DELETE FROM places WHERE source = ${source}`;
    await tx`
      INSERT INTO places (source, source_id, kind, name, alt_names, geom)
      SELECT ${source}, r.source_id, r.kind, r.name, ARRAY(SELECT jsonb_array_elements_text(r.alt)), ST_SetSRID(ST_MakePoint(r.lng, r.lat), 4326)
      FROM jsonb_to_recordset(${tx.json(rows)}) AS r(source_id text, kind text, name text, lng float8, lat float8, alt jsonb)
      ON CONFLICT DO NOTHING`;
  });
}

/** Las dos fuentes; una que falla no frena a la otra. */
export async function syncPlaces(snapshot: ItinerariesSnapshot, opts: { deadline?: number; retryMs?: number } = {}) {
  const [stops, landmarks] = await Promise.allSettled([syncStops(snapshot, opts), syncLandmarks(opts)]);
  for (const r of [stops, landmarks]) if (r.status === "rejected") console.error("lugares", r.reason);
  return {
    stops: stops.status === "fulfilled" ? stops.value.stops : null,
    landmarks: landmarks.status === "fulfilled" ? landmarks.value.landmarks : null,
  };
}

/**
 * El índice que se baja entero al teléfono (/api/places): una parada por nombre y lugar (el VMT la repite en cada
 * recorrido), sin los nombres de ruta que se repiten a lo largo de kilómetros.
 */
export async function listPlaces(): Promise<PlacesFile> {
  const rows = await sql()<{ name: string; kind: PlaceKind; lng: number; lat: number; alt_names: string[] }[]>`
    WITH cells AS (
      SELECT name, kind, geom, alt_names, source_id,
        round(ST_X(geom) / ${SAME_STOP_DEG}) AS cx, round(ST_Y(geom) / ${SAME_STOP_DEG}) AS cy
      FROM places WHERE kind = 'stop'
    ), stops AS (
      SELECT DISTINCT ON (name, cx, cy) name, kind, geom, alt_names FROM cells ORDER BY name, cx, cy, source_id
    ), named AS (
      SELECT *, count(*) OVER (PARTITION BY name) AS n FROM stops
    )
    SELECT name, kind, round(ST_X(geom)::numeric, 5)::float8 AS lng, round(ST_Y(geom)::numeric, 5)::float8 AS lat, alt_names
    FROM (SELECT name, kind, geom, alt_names FROM named WHERE n <= ${MAX_STOPS_PER_NAME}
          UNION ALL SELECT name, kind, geom, alt_names FROM places WHERE kind <> 'stop') p
    ORDER BY kind, name, lng, lat`;
  const places: PlaceRow[] = rows.map((r) => (r.alt_names.length ? [r.name, r.lng, r.lat, r.kind, r.alt_names] : [r.name, r.lng, r.lat, r.kind]));
  const version = createHash("sha256").update(JSON.stringify(places)).digest("base64url").slice(0, 12);
  return { version, places };
}
