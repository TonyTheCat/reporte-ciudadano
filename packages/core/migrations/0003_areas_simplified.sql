-- Geometría simplificada precalculada para servir coropléticos rápido.
ALTER TABLE admin_areas
  ADD COLUMN geom_simple geometry(Geometry, 4326)
  GENERATED ALWAYS AS (ST_SimplifyPreserveTopology(geom, 0.003)) STORED;
