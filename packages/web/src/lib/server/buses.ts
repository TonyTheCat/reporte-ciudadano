/**
 * Posición de los colectivos del área metropolitana, del prototipo del VMT (MOPC). No es un dato abierto
 * oficial: no tiene licencia ni garantía de que siga igual, así que todo lo que depende de su formato está acá.
 * Los buses reportan su GPS cada ~10 s.
 */
const VMT_API = "https://sistemas.mopc.gov.py/prototipo_vmt/api";
const TIMEOUT_MS = 5000;
// Un bus que no reportó en este tiempo está apagado o fuera de servicio.
const STALE_MS = 2 * 60 * 1000;
const COMPANIES_TTL_MS = 60 * 60 * 1000;
const BUSES_TTL_MS = 10 * 1000;

interface VmtCompany { cod_catalogo: number }
// `linea_label` viene vacío cuando el bus no tiene un recorrido asignado (route_id "0000").
interface VmtBus {
  id_bus: number; latitude: number; longitude: number; rumbo: number; velocidad: number;
  fecha_hora: string; linea_label: string | null; eot_nombre: string;
}

export interface BusFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { id: number; line: string | null; company: string; bearing: number; speed: number; at: string };
}

async function vmt<T>(path: string): Promise<T[]> {
  const res = await fetch(`${VMT_API}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`VMT ${path}: HTTP ${res.status}`);
  const body = (await res.json()) as { success: boolean; data: T[] };
  if (!body.success || !Array.isArray(body.data)) throw new Error(`VMT ${path}: respuesta inesperada`);
  return body.data;
}

// La lista de empresas casi no cambia. El prototipo solo devuelve buses de a una empresa por pedido.
let companies: { at: number; codes: Promise<number[]> } | undefined;
function companyCodes(): Promise<number[]> {
  if (!companies || Date.now() - companies.at > COMPANIES_TTL_MS) {
    const codes = vmt<VmtCompany>("/empresas").then((rows) => rows.map((r) => r.cod_catalogo));
    companies = { at: Date.now(), codes };
    codes.catch(() => companies?.codes === codes && (companies = undefined));
  }
  return companies.codes;
}

export function toFeature(b: VmtBus): BusFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [b.longitude, b.latitude] },
    properties: { id: b.id_bus, line: b.linea_label, company: b.eot_nombre, bearing: b.rumbo, speed: b.velocidad, at: b.fecha_hora },
  };
}

/** Buses que reportaron hace poco, con coordenadas válidas. Un bus repetido entre empresas queda con su último reporte. */
export function liveBuses(rows: VmtBus[], now = Date.now()): BusFeature[] {
  const latest = new Map<number, VmtBus>();
  for (const b of rows) {
    if (!Number.isFinite(b.latitude) || !Number.isFinite(b.longitude) || now - Date.parse(b.fecha_hora) > STALE_MS) continue;
    const prev = latest.get(b.id_bus);
    if (!prev || Date.parse(b.fecha_hora) > Date.parse(prev.fecha_hora)) latest.set(b.id_bus, b);
  }
  return [...latest.values()].map(toFeature);
}

async function fetchBuses(): Promise<BusFeature[]> {
  const codes = await companyCodes();
  const results = await Promise.allSettled(codes.map((c) => vmt<VmtBus>(`/buses?cod_catalogo=${c}`)));
  const ok = results.filter((r): r is PromiseFulfilledResult<VmtBus[]> => r.status === "fulfilled");
  // Si cae una empresa se muestran las demás; si caen todas, el prototipo no está respondiendo.
  if (!ok.length && codes.length) throw (results[0] as PromiseRejectedResult).reason;
  return liveBuses(ok.flatMap((r) => r.value));
}

// Un mismo pedido al VMT por instancia cada 10 s, por más usuarios que miren el mapa (CloudFront suma su caché).
let buses: { at: number; list: Promise<BusFeature[]> } | undefined;
export function currentBuses(): Promise<BusFeature[]> {
  if (!buses || Date.now() - buses.at > BUSES_TTL_MS) {
    const list = fetchBuses();
    buses = { at: Date.now(), list };
    list.catch(() => buses?.list === list && (buses = undefined));
  }
  return buses.list;
}
