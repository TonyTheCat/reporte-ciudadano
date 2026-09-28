import { sql } from "./db";

/**
 * Límite por ventana fija guardado en Postgres (sin Redis ni WAF, que tienen costo fijo).
 * Devuelve true si la acción está permitida.
 */
export async function hit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const [row] = await sql()<{ hits: number }[]>`
    INSERT INTO rate_limits (key, bucket)
    VALUES (${key}, to_timestamp(floor(extract(epoch FROM now()) / ${windowSeconds}) * ${windowSeconds}))
    ON CONFLICT (key, bucket) DO UPDATE SET hits = rate_limits.hits + 1
    RETURNING hits`;
  // Limpieza oportunista de ventanas viejas.
  if (Math.random() < 0.01) await sql()`DELETE FROM rate_limits WHERE bucket < now() - interval '2 days'`;
  return row.hits <= max;
}
