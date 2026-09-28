/**
 * Carga departamentos (ADM1) y distritos (ADM2) de Paraguay desde geoBoundaries
 * (fuente: DGEEC/INE, licencia CC BY 4.0). Idempotente: reemplaza las áreas del país.
 */
import { departmentName, districtName } from "./area-names";
import { sql } from "./db";
import { slugify } from "./util";

const COUNTRY = { iso2: "PY", iso3: "PRY" };

interface Feature {
  properties: { shapeName: string; shapeID: string };
  geometry: object;
}

async function fetchLevel(level: "ADM1" | "ADM2"): Promise<Feature[]> {
  const meta = await (await fetch(`https://www.geoboundaries.org/api/current/gbOpen/${COUNTRY.iso3}/${level}/`)).json();
  const res = await fetch(meta.gjDownloadURL);
  if (!res.ok) throw new Error(`No se pudo descargar ${level}: ${res.status}`);
  const fc = await res.json();
  return fc.features;
}

export async function seedAreas() {
  const s = sql();
  const [adm1, adm2] = await Promise.all([fetchLevel("ADM1"), fetchLevel("ADM2")]);
  console.log(`Descargados: ${adm1.length} departamentos, ${adm2.length} distritos`);

  const [{ used }] = await s<{ used: number }[]>`
    SELECT count(*)::int AS used FROM reports WHERE dept_id IS NOT NULL OR district_id IS NOT NULL`;

  await s.begin(async (tx) => {
    // Se desvinculan los reportes, se recargan las áreas y el trigger las vuelve a asignar.
    if (used) await tx`UPDATE reports SET dept_id = NULL, district_id = NULL, barrio_id = NULL`;
    await tx`DELETE FROM admin_areas WHERE country_code = ${COUNTRY.iso2} AND level = 3`;
    await tx`DELETE FROM admin_areas WHERE country_code = ${COUNTRY.iso2} AND level = 2`;
    await tx`DELETE FROM admin_areas WHERE country_code = ${COUNTRY.iso2} AND level = 1`;

    for (const f of adm1) {
      await tx`
        INSERT INTO admin_areas (country_code, level, name, slug, geom)
        VALUES (${COUNTRY.iso2}, 1, ${departmentName(f.properties.shapeName)}, ${slugify(f.properties.shapeName)},
          ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(f.geometry)}), 4326)), 3)))`;
    }

    const seen = new Map<string, number>();
    for (const f of adm2) {
      const geo = JSON.stringify(f.geometry);
      // Padre = departamento que contiene un punto interior del distrito.
      const [parent] = await tx<{ id: number }[]>`
        SELECT id FROM admin_areas WHERE country_code = ${COUNTRY.iso2} AND level = 1
        ORDER BY ST_Area(ST_Intersection(geom, ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${geo}), 4326)))) DESC LIMIT 1`;
      let slug = slugify(f.properties.shapeName);
      const key = `${parent?.id}:${slug}`;
      const n = (seen.get(key) ?? 0) + 1;
      seen.set(key, n);
      if (n > 1) slug = `${slug}-${n}`;
      await tx`
        INSERT INTO admin_areas (country_code, level, name, slug, parent_id, geom)
        VALUES (${COUNTRY.iso2}, 2, ${districtName(f.properties.shapeName)}, ${slug}, ${parent?.id ?? null},
          ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${geo}), 4326)), 3)))`;
    }

  });
  // Reasigna áreas a los reportes existentes (el trigger solo recalcula cuando cambia geom).
  await s`
    UPDATE reports r SET
      dept_id = (SELECT id FROM admin_areas a WHERE a.level = 1 AND ST_Intersects(a.geom, r.geom) LIMIT 1),
      district_id = (SELECT id FROM admin_areas a WHERE a.level = 2 AND ST_Intersects(a.geom, r.geom) LIMIT 1)`;
  console.log("Áreas cargadas.");
}

/** Carga las áreas solo si la tabla está vacía (primer deploy). */
export async function seedAreasIfEmpty(): Promise<boolean> {
  const [{ n }] = await sql()<{ n: number }[]>`SELECT count(*)::int AS n FROM admin_areas`;
  if (n > 0) return false;
  await seedAreas();
  return true;
}
