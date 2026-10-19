import { LATEST_BUSES_KEY } from "@rc/core/vmt";
import { collectBuses, rawBusesKey, savePoll } from "@rc/core/vmt-history";
import { putJsonGz } from "./vmt-store";

/**
 * Cada minuto (infra/buses.ts): guarda la posición de todos los colectivos en S3 y cómo respondió el VMT en la base.
 * También deja la consulta como la última, que el mapa muestra al abrirse (ver LATEST_BUSES_KEY).
 */
export async function handler() {
  const poll = await collectBuses();
  const [bytes, , rows] = await Promise.all([
    putJsonGz(rawBusesKey(new Date(poll.polled_at)), poll),
    putJsonGz(LATEST_BUSES_KEY, poll),
    savePoll(poll),
  ]);
  const failed = poll.companies.filter((c) => !c.buses).map((c) => c.code);
  const buses = poll.companies.reduce((n, c) => n + (c.buses?.length ?? 0), 0);
  console.log("consulta del VMT guardada", { buses, failed, bytes, rows });
  return { buses, failed };
}
