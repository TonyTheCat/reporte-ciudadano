import { STATUSES } from "@rc/core/status";
import { z } from "zod";

const coord = z.number();
// `slugify` corta en 60 caracteres.
export const slugParam = z.string().max(60);

/** Filtros públicos de listados de reportes que llegan por query string (API y tiles). */
export const reportQuerySchema = z.object({
  bbox: z
    .string()
    .transform((s) => s.split(",").map(Number))
    .pipe(z.tuple([coord, coord, coord, coord])) // minLng, minLat, maxLng, maxLat
    .optional(),
  category: slugParam.optional(),
  status: z.enum([...STATUSES, "abiertos"]).optional(),
  q: z.string().transform((s) => s.slice(0, 80)).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(30),
});

/** Parámetros vacíos (`?status=` de un formulario) cuentan como ausentes. */
export function nonEmptyParams(params: URLSearchParams): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [k, v] of params) if (v) obj[k] = v;
  return obj;
}
