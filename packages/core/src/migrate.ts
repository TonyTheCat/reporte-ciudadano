import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type postgres from "postgres";

/** Aplica en orden los archivos .sql de `dir` que aún no se ejecutaron. */
export async function runMigrations(sql: postgres.Sql, dir: string): Promise<string[]> {
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
  // Evita que dos deploys migren en paralelo.
  await sql`SELECT pg_advisory_lock(727274)`;
  try {
    const done = new Set((await sql<{ name: string }[]>`SELECT name FROM schema_migrations`).map((r) => r.name));
    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
    const applied: string[] = [];
    for (const file of files) {
      if (done.has(file)) continue;
      const body = await readFile(path.join(dir, file), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx`INSERT INTO schema_migrations (name) VALUES (${file})`;
      });
      applied.push(file);
    }
    return applied;
  } finally {
    await sql`SELECT pg_advisory_unlock(727274)`;
  }
}
