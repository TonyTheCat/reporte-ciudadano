import type { Scope } from "@rc/core/stats";
import { z } from "zod";

const polygon = z.object({
  type: z.enum(["Polygon", "MultiPolygon"]),
  coordinates: z.array(z.any()).min(1),
});

export const scopeSchema = z.object({
  dept: z.coerce.number().int().optional(),
  district: z.coerce.number().int().optional(),
  category: z.string().max(40).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  polygon: polygon.optional(),
});

export function toScope(s: z.infer<typeof scopeSchema>): Scope {
  return { deptId: s.dept, districtId: s.district, category: s.category, from: s.from, to: s.to, polygon: s.polygon };
}

export function scopeFromQuery(params: URLSearchParams) {
  const obj: Record<string, string> = {};
  for (const k of ["dept", "district", "category", "from", "to"]) {
    const v = params.get(k);
    if (v) obj[k] = v;
  }
  return toScope(scopeSchema.parse(obj));
}
