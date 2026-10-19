/**
 * Índice de paradas y lugares (/api/places), para buscar la parada por nombre en el teléfono: se baja entero, así lo
 * que busca cada persona no llega al servidor. Lo guarda la cache HTTP del navegador (una hora).
 */
import { buildPlaceIndex, type PlaceIndex, type PlacesFile } from "@rc/core/place-search";
import { PRIVATE_FETCH } from "./live-buses";

let loading: Promise<PlaceIndex | null> | undefined;

/** `null` si no se pudo bajar; el siguiente pedido vuelve a intentar. */
export function loadPlaces(f: typeof fetch = fetch): Promise<PlaceIndex | null> {
  loading ??= f("/api/places", PRIVATE_FETCH)
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const file = (await res.json()) as PlacesFile;
      if (typeof file?.version !== "string" || !Array.isArray(file.places)) throw new Error("índice inválido");
      return buildPlaceIndex(file);
    })
    .catch(() => {
      loading = undefined;
      return null;
    });
  return loading;
}
