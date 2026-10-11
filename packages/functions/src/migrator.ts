import path from "node:path";
import { syncBusRoutesIfEmpty } from "@rc/core/bus-routes";
import { sql } from "@rc/core/db";
import { runMigrations } from "@rc/core/migrate";
import { seedAreasIfEmpty } from "@rc/core/seed-areas";

export async function handler() {
  // `copyFiles` deja las migraciones junto al bundle.
  const applied = await runMigrations(sql(), path.join(process.cwd(), "migrations"));
  // En el primer deploy carga departamentos y distritos (descarga desde geoBoundaries vía NAT).
  const seeded = await seedAreasIfEmpty();
  // Y los recorridos de los colectivos, que después actualiza BusRoutesSync. El VMT es un prototipo: si no
  // responde, el deploy sigue y los carga la corrida del día siguiente.
  const busRoutes = await syncBusRoutesIfEmpty().catch((err: unknown) => {
    console.error("recorridos de colectivos", err);
    return false;
  });
  console.log("migraciones aplicadas", applied, "áreas cargadas", seeded, "recorridos cargados", busRoutes);
  return { applied, seeded, busRoutes };
}
