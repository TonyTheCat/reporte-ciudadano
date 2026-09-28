import { sql } from "./db";

export interface Area {
  id: number;
  country_code: string;
  level: number;
  name: string;
  slug: string;
  parent_id: number | null;
  parent_slug: string | null;
  bbox: [number, number, number, number];
}

const SELECT_AREA = (s: ReturnType<typeof sql>) => s`
  SELECT a.id, a.country_code, a.level, a.name, a.slug, a.parent_id, p.slug AS parent_slug,
    ARRAY[ST_XMin(a.geom), ST_YMin(a.geom), ST_XMax(a.geom), ST_YMax(a.geom)]::float8[] AS bbox
  FROM admin_areas a LEFT JOIN admin_areas p ON p.id = a.parent_id`;

export async function listDepartments(country = "PY"): Promise<Area[]> {
  const s = sql();
  return s<Area[]>`${SELECT_AREA(s)} WHERE a.country_code = ${country} AND a.level = 1 ORDER BY a.name`;
}

export async function listChildren(parentId: number): Promise<Area[]> {
  const s = sql();
  return s<Area[]>`${SELECT_AREA(s)} WHERE a.parent_id = ${parentId} ORDER BY a.name`;
}

export async function getDepartment(slug: string, country = "PY"): Promise<Area | undefined> {
  const s = sql();
  const [a] = await s<Area[]>`${SELECT_AREA(s)} WHERE a.country_code = ${country} AND a.level = 1 AND a.slug = ${slug}`;
  return a;
}

export async function getDistrict(deptSlug: string, slug: string, country = "PY"): Promise<Area | undefined> {
  const s = sql();
  const [a] = await s<Area[]>`${SELECT_AREA(s)}
    WHERE a.country_code = ${country} AND a.level = 2 AND a.slug = ${slug} AND p.slug = ${deptSlug}`;
  return a;
}

/** Área administrativa que contiene un punto (útil para mostrar "Asunción, Central" al reportar). */
export async function locate(lat: number, lng: number) {
  const rows = await sql()<{ level: number; name: string; slug: string }[]>`
    SELECT level, name, slug FROM admin_areas
    WHERE ST_Intersects(geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)) ORDER BY level`;
  return {
    dept: rows.find((r) => r.level === 1) ?? null,
    district: rows.find((r) => r.level === 2) ?? null,
    barrio: rows.find((r) => r.level === 3) ?? null,
  };
}

/** GeoJSON simplificado de un nivel, para coropléticos. */
export async function areasGeoJSON(level: 1 | 2, parentId?: number, country = "PY") {
  const s = sql();
  const [row] = await s<{ fc: unknown }[]>`
    SELECT json_build_object('type', 'FeatureCollection', 'features', coalesce(json_agg(json_build_object(
      'type', 'Feature', 'id', a.id,
      'properties', json_build_object('id', a.id, 'name', a.name, 'slug', a.slug),
      'geometry', ST_AsGeoJSON(a.geom_simple, 5)::json
    )), '[]'::json)) AS fc
    FROM admin_areas a
    WHERE a.country_code = ${country} AND a.level = ${level}
      ${parentId ? s`AND a.parent_id = ${parentId}` : s``}`;
  return row.fc;
}
