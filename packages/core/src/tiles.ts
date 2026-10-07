import { sql } from "./db";

/**
 * Tile vectorial (MVT) con los reportes publicados. Capa "reports".
 * En zoom bajo se agrupan en una grilla (capa "clusters") para no enviar miles de puntos.
 */
export async function reportTile(z: number, x: number, y: number, f: { category?: string; status?: string } = {}) {
  if (![z, x, y].every(Number.isInteger) || z < 0 || z > 22 || x < 0 || y < 0 || x >= 2 ** z || y >= 2 ** z) return null;
  const s = sql();
  const cat = f.category ? s`AND c.slug = ${f.category}` : s``;
  const st =
    f.status === "abiertos"
      ? s`AND r.status IN ('nuevo','verificado','en_proceso','derivado')`
      : f.status
        ? s`AND r.status = ${f.status}::report_status`
        : s``;

  if (z < 11) {
    // Grilla de ~64 celdas por tile: se agrupa en 3857 y se devuelven centroides con conteo.
    const [row] = await s<{ mvt: Buffer }[]>`
      WITH bounds AS (SELECT ST_TileEnvelope(${z}, ${x}, ${y}) AS geom),
      pts AS (
        SELECT ST_Transform(r.geom, 3857) AS g, r.status
        FROM reports r JOIN categories c ON c.id = r.category_id, bounds b
        WHERE r.visibility = 'published' AND ST_Transform(r.geom, 3857) && b.geom ${cat} ${st}
      ),
      grid AS (
        SELECT ST_SnapToGrid(g, (SELECT (ST_XMax(geom) - ST_XMin(geom)) / 8 FROM bounds)) AS cell,
          count(*) AS n,
          count(*) FILTER (WHERE status = 'resuelto') AS resolved,
          ST_Centroid(ST_Collect(g)) AS center
        FROM pts GROUP BY 1
      ),
      mvtgeom AS (
        SELECT ST_AsMVTGeom(center, b.geom) AS geom, n::int AS count, resolved::int AS resolved
        FROM grid, bounds b
      )
      SELECT ST_AsMVT(mvtgeom.*, 'clusters') AS mvt FROM mvtgeom`;
    return row.mvt;
  }

  const [row] = await s<{ mvt: Buffer }[]>`
    WITH bounds AS (SELECT ST_TileEnvelope(${z}, ${x}, ${y}) AS geom),
    mvtgeom AS (
      SELECT ST_AsMVTGeom(ST_Transform(r.geom, 3857), b.geom) AS geom,
        r.public_code AS code, r.slug, r.title, r.status::text AS status,
        c.slug AS category, c.icon, c.color, r.confirmations_count AS confirmations,
        extract(epoch FROM r.created_at)::int AS created
      FROM reports r JOIN categories c ON c.id = r.category_id, bounds b
      WHERE r.visibility = 'published' AND ST_Transform(r.geom, 3857) && b.geom ${cat} ${st}
      LIMIT 5000
    )
    SELECT ST_AsMVT(mvtgeom.*, 'reports') AS mvt FROM mvtgeom`;
  return row.mvt;
}
