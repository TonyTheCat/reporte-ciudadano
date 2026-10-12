import { syncBusRoutes } from "@rc/core/bus-routes";

/** Una vez por día (infra/buses.ts): trae del VMT los recorridos de los colectivos a la base. */
export async function handler() {
  const result = await syncBusRoutes();
  console.log("recorridos sincronizados", result);
  return result;
}
