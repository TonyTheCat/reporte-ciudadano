/**
 * Búsqueda de paradas y lugares por nombre (ver places.ts), en el teléfono: como el catálogo de recorridos, el
 * índice se baja entero y lo que busca cada persona no llega al servidor. Busca por partes del nombre ("del sol",
 * "aviadores"), sin tildes ni mayúsculas, con las abreviaturas de las calles ("Mcal." = "Mariscal") y siglas
 * conocidas ("BCP" = "Banco Central del Paraguay"). No importa `db.ts`: lo usa el navegador.
 */

/** Un lugar del índice: [nombre, lng, lat, tipo, otros nombres]. Así el archivo pesa la mitad que con objetos. */
export type PlaceRow = [name: string, lng: number, lat: number, kind: PlaceKind, alt?: string[]];
export interface PlacesFile { version: string; places: PlaceRow[] }

export type PlaceKind =
  | "stop" | "mall" | "supermarket" | "store" | "bank" | "hospital" | "clinic" | "university" | "school" | "market"
  | "church" | "townhall" | "police" | "terminal" | "court" | "library" | "theatre" | "cinema" | "park" | "stadium"
  | "museum" | "attraction" | "government";

export const KIND_LABEL: Record<PlaceKind, string> = {
  stop: "Parada", mall: "Shopping", supermarket: "Supermercado", store: "Tienda", bank: "Banco", hospital: "Hospital",
  clinic: "Clínica", university: "Universidad", school: "Escuela", market: "Mercado", church: "Iglesia",
  townhall: "Municipalidad", police: "Policía", terminal: "Terminal", court: "Tribunal", library: "Biblioteca",
  theatre: "Teatro", cinema: "Cine", park: "Plaza o parque", stadium: "Estadio", museum: "Museo", attraction: "Lugar",
  government: "Oficina pública",
};

// Abreviaturas de los nombres de calles y lugares: se expanden igual en el índice y en lo que se busca.
const ABBREVIATIONS: Record<string, string> = {
  av: "avenida", avda: "avenida", avd: "avenida", mcal: "mariscal", gral: "general", tte: "teniente", cnel: "coronel",
  cap: "capitan", cptan: "capitan", sgto: "sargento", dr: "doctor", dra: "doctora", pdte: "presidente", pte: "presidente",
  sta: "santa", sto: "santo", ing: "ingeniero", prof: "profesor", gob: "gobernador", mons: "monsenor", hno: "hermano",
  esq: "esquina", c: "casi", nra: "nuestra", sra: "senora", univ: "universidad", hosp: "hospital", shop: "shopping",
};

// Siglas y nombres de uso común que no están en los datos. La clave va ya normalizada.
const SYNONYMS: Record<string, string[]> = {
  bcp: ["banco central del paraguay"],
  ips: ["instituto de prevision social", "ips"],
  una: ["universidad nacional de asuncion"],
  uca: ["universidad catolica"],
  ande: ["administracion nacional de electricidad"],
  essap: ["essap"],
  bnf: ["banco nacional de fomento"],
  mopc: ["ministerio de obras publicas"],
  terminal: ["terminal de omnibus", "terminal"],
  costanera: ["costanera"],
  "palacio de gobierno": ["palacio de los lopez"],
  "mburuvicha roga": ["mburuvicha roga"],
};

/** Minúsculas, sin tildes ni signos y con las abreviaturas expandidas: "Avda. Mcal. López" -> "avenida mariscal lopez". */
export function normSearch(s: string): string {
  return s
    .normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim()
    .split(" ").map((w) => ABBREVIATIONS[w] ?? w).join(" ");
}

export interface Place { name: string; lng: number; lat: number; kind: PlaceKind }
export interface PlaceIndex { version: string; entries: { place: Place; text: string; words: string[] }[] }

export function buildPlaceIndex(file: PlacesFile): PlaceIndex {
  return {
    version: file.version,
    entries: file.places.map(([name, lng, lat, kind, alt]) => {
      const text = normSearch([name, ...(alt ?? [])].join(" "));
      return { place: { name, lng, lat, kind }, text, words: text.split(" ") };
    }),
  };
}

/** Lo buscado y, si es una sigla o nombre conocido, también lo que significa. */
function variants(query: string): string[][] {
  const q = normSearch(query);
  if (!q) return [];
  const out = [q.split(" ")];
  for (const syn of SYNONYMS[q] ?? []) out.push(syn.split(" "));
  return out;
}

/**
 * Los lugares que contienen todas las palabras buscadas (en cualquier parte del nombre), primero los que tienen
 * palabras que empiezan como las buscadas y, entre esos, los nombres más cortos. Un nombre repetido (la misma parada
 * en varios recorridos) sale una vez.
 */
export function searchPlaces(index: PlaceIndex, query: string, limit = 8): Place[] {
  const vs = variants(query);
  if (!vs.length || vs[0].join("").length < 2) return [];
  const scored: { place: Place; score: number }[] = [];
  for (const e of index.entries) {
    let best = Infinity;
    for (const tokens of vs) {
      if (!tokens.every((t) => e.text.includes(t))) continue;
      const prefix = tokens.every((t) => e.words.some((w) => w.startsWith(t)));
      best = Math.min(best, (prefix ? 0 : 1) + (e.text.startsWith(tokens[0]) ? 0 : 0.5));
    }
    if (best < Infinity) scored.push({ place: e.place, score: best });
  }
  scored.sort((a, b) => a.score - b.score || a.place.name.length - b.place.name.length || a.place.name.localeCompare(b.place.name));
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const { place } of scored) {
    const key = `${normSearch(place.name)}|${place.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(place);
    if (out.length === limit) break;
  }
  return out;
}
