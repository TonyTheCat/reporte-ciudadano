import { syncBusRoutes } from "@rc/core/bus-routes";
import { syncPlaces } from "@rc/core/places";
import { rawItinerariesKey } from "@rc/core/vmt-history";
import type { Context } from "aws-lambda";
import { putJsonGz } from "./vmt-store";

// Lo que puede tardar la última empresa pedida (60 s) más guardar en la base.
const MARGIN_MS = 90_000;

/**
 * Una vez por día (infra/buses.ts): trae del VMT los recorridos de los colectivos a la base y guarda la respuesta
 * cruda. Después, las paradas de esos recorridos y los lugares de OpenStreetMap para buscar la parada por nombre.
 */
export async function handler(_event: unknown, context: Context) {
  const deadline = Date.now() + context.getRemainingTimeInMillis() - MARGIN_MS;
  const { snapshot, ...routes } = await syncBusRoutes({ deadline });
  // La foto del día es el historial de recorridos: con ella se sabe qué trazado tenía cada ruta en una fecha.
  await putJsonGz(rawItinerariesKey(new Date(snapshot.synced_at)), snapshot);
  const places = await syncPlaces(snapshot, { deadline });
  const result = { ...routes, places };
  console.log("recorridos sincronizados", result);
  return result;
}
