/**
 * Cliente del prototipo del VMT (MOPC): empresas, posición de los colectivos y sus recorridos. No es un dato
 * abierto oficial: no tiene licencia ni garantía de que siga igual, así que todo lo que depende de su formato
 * está acá. Los buses reportan su GPS cada ~10 s.
 */
const VMT_API = "https://sistemas.mopc.gov.py/prototipo_vmt/api";
const TIMEOUT_MS = 5000;

export interface VmtCompany { cod_catalogo: number }
// `linea_label` viene vacío cuando el bus no tiene un recorrido asignado (route_id "0000").
export interface VmtBus {
  id_bus: number; latitude: number; longitude: number; rumbo: number; velocidad: number;
  fecha_hora: string; linea_label: string | null; eot_nombre: string; route_id: string; tiene_rampa: boolean;
}
export interface VmtItinerary {
  ruta_hex: string; ruta_linea: string; sentido: string; origen: string; destino: string;
  geojson: { type: "MultiLineString"; coordinates: [number, number][][] } | { type: "LineString"; coordinates: [number, number][] };
}

export async function vmt<T>(path: string, timeout = TIMEOUT_MS): Promise<T[]> {
  const res = await fetch(`${VMT_API}${path}`, { signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`VMT ${path}: HTTP ${res.status}`);
  const body = (await res.json()) as { success: boolean; data: T[] };
  if (!body.success || !Array.isArray(body.data)) throw new Error(`VMT ${path}: respuesta inesperada`);
  return body.data;
}
