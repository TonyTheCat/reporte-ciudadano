-- Recorridos de los colectivos (itinerarios del prototipo del VMT). Los carga una vez por día la Lambda
-- BusRoutesSync: el VMT tarda segundos en armar los de una empresa y cambian muy de vez en cuando.
CREATE TABLE bus_routes (
  company_code int  NOT NULL,                                -- cod_catalogo de la empresa en el VMT
  route_hex    text NOT NULL,                                -- ruta_hex en minúsculas, el route_id de cada bus
  line         text NOT NULL,
  direction    text NOT NULL,
  origin       text NOT NULL,
  destination  text NOT NULL,
  geom         geometry(MultiLineString, 4326) NOT NULL,
  synced_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_code, route_hex)
);
