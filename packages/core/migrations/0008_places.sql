-- Paradas del VMT y lugares conocidos de OpenStreetMap, para buscar la parada por nombre en ¿Cuándo salgo?
-- (ver packages/core/src/places.ts). Se reemplazan por fuente una vez por día.
CREATE TABLE places (
  source     text NOT NULL,                  -- 'vmt' | 'osm'
  source_id  text NOT NULL,                  -- id de la parada en el VMT, o 'node/123' | 'way/123' en OSM
  kind       text NOT NULL,                  -- 'stop', 'mall', 'bank', ... (PlaceKind en place-search.ts)
  name       text NOT NULL,
  alt_names  text[] NOT NULL DEFAULT '{}',   -- otros nombres en OSM: alt_name, short_name, ...
  geom       geometry(Point, 4326) NOT NULL,
  synced_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source, source_id)
);
