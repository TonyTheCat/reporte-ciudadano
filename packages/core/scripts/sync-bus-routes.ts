/** Carga en la base local los recorridos de los colectivos y los lugares para buscar paradas (en AWS lo hace la Lambda BusRoutesSync cada día). */
import { syncBusRoutes } from "../src/bus-routes";
import { closeDb } from "../src/db";
import { syncPlaces } from "../src/places";

process.env.DATABASE_URL ??= "postgres://postgres:password@localhost:5433/reporte";
const { routes, failed, skipped, snapshot } = await syncBusRoutes();
console.log(`Recorridos cargados: ${routes}${failed.length ? ` (fallaron las empresas ${failed.join(", ")})` : ""}${skipped.length ? ` (sin pedir: ${skipped.join(", ")})` : ""}`);
const places = await syncPlaces(snapshot);
console.log(`Paradas: ${places.stops ?? "falló"} · lugares de OpenStreetMap: ${places.landmarks ?? "falló"}`);
await closeDb();
