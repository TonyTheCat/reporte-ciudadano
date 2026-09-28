import path from "node:path";
import { fileURLToPath } from "node:url";
import { closeDb, sql } from "../src/db";
import { runMigrations } from "../src/migrate";

process.env.DATABASE_URL ??= "postgres://postgres:password@localhost:5433/reporte";
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../migrations");
const applied = await runMigrations(sql(), dir);
console.log(applied.length ? `Aplicadas: ${applied.join(", ")}` : "Sin migraciones pendientes");
await closeDb();
