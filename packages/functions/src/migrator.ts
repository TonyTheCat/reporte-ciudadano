import path from "node:path";
import { sql } from "@rc/core/db";
import { runMigrations } from "@rc/core/migrate";
import { seedAreasIfEmpty } from "@rc/core/seed-areas";

export async function handler() {
  // `copyFiles` deja las migraciones junto al bundle.
  const applied = await runMigrations(sql(), path.join(process.cwd(), "migrations"));
  // En el primer deploy carga departamentos y distritos (descarga desde geoBoundaries vía NAT).
  const seeded = await seedAreasIfEmpty();
  console.log("migraciones aplicadas", applied, "áreas cargadas", seeded);
  return { applied, seeded };
}
