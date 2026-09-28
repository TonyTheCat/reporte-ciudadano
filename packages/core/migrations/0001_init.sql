CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TYPE report_status AS ENUM (
  'nuevo', 'verificado', 'en_proceso', 'derivado', 'resuelto', 'rechazado', 'duplicado'
);
CREATE TYPE report_visibility AS ENUM ('published', 'pending', 'hidden');
CREATE TYPE event_type AS ENUM ('created', 'status_change', 'comment', 'photo', 'confirmation', 'visibility');

CREATE TABLE categories (
  id          serial PRIMARY KEY,
  slug        text UNIQUE NOT NULL,
  name        text NOT NULL,
  description text,
  icon        text NOT NULL,
  color       text NOT NULL,
  sort_order  int  NOT NULL DEFAULT 100,
  -- Ventana en la que se aceptan reportes nuevos (p. ej. propaganda electoral post-elecciones).
  active_from timestamptz,
  active_to   timestamptz,
  extra_fields jsonb NOT NULL DEFAULT '[]'
);

CREATE TABLE admin_areas (
  id           serial PRIMARY KEY,
  country_code char(2) NOT NULL DEFAULT 'PY',
  level        smallint NOT NULL CHECK (level BETWEEN 1 AND 3), -- 1 departamento, 2 distrito, 3 barrio
  name         text NOT NULL,
  slug         text NOT NULL,
  parent_id    int REFERENCES admin_areas(id),
  geom         geometry(MultiPolygon, 4326) NOT NULL,
  UNIQUE (country_code, parent_id, slug)
);
CREATE INDEX admin_areas_geom_idx ON admin_areas USING gist (geom);
CREATE INDEX admin_areas_level_idx ON admin_areas (country_code, level);

CREATE SEQUENCE report_code_seq;

CREATE TABLE reports (
  id                 text PRIMARY KEY,           -- ULID
  public_code        text UNIQUE NOT NULL,       -- PY-2026-000123
  slug               text NOT NULL,
  category_id        int NOT NULL REFERENCES categories(id),
  title              text NOT NULL CHECK (char_length(title) BETWEEN 5 AND 120),
  description        text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  extra              jsonb NOT NULL DEFAULT '{}',
  status             report_status NOT NULL DEFAULT 'nuevo',
  visibility         report_visibility NOT NULL DEFAULT 'published',
  geom               geometry(Point, 4326) NOT NULL,
  address            text,
  country_code       char(2) NOT NULL DEFAULT 'PY',
  dept_id            int REFERENCES admin_areas(id),
  district_id        int REFERENCES admin_areas(id),
  barrio_id          int REFERENCES admin_areas(id),
  reporter_user_id   text,                       -- Cognito sub, nullable (anónimo)
  anon_token_hash    text,                       -- sha256 del token de seguimiento anónimo
  ip_hash            text,
  duplicate_of       text REFERENCES reports(id),
  confirmations_count int NOT NULL DEFAULT 0,
  flags_count        int NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  resolved_at        timestamptz
);
CREATE INDEX reports_geom_idx ON reports USING gist (geom);
CREATE INDEX reports_public_idx ON reports (visibility, status, created_at DESC);
CREATE INDEX reports_category_idx ON reports (category_id);
CREATE INDEX reports_dept_idx ON reports (dept_id);
CREATE INDEX reports_district_idx ON reports (district_id);
CREATE INDEX reports_reporter_idx ON reports (reporter_user_id) WHERE reporter_user_id IS NOT NULL;

CREATE TABLE report_photos (
  id               text PRIMARY KEY,
  report_id        text NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  kind             text NOT NULL DEFAULT 'report' CHECK (kind IN ('report', 'resolution')),
  s3_key_original  text NOT NULL,
  s3_key_public    text,
  s3_key_thumb     text,
  width            int,
  height           int,
  status           text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'approved', 'rejected', 'review')),
  moderation       jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX report_photos_report_idx ON report_photos (report_id);
CREATE INDEX report_photos_review_idx ON report_photos (status) WHERE status IN ('review', 'processing');

CREATE TABLE report_events (
  id          bigserial PRIMARY KEY,
  report_id   text NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  type        event_type NOT NULL,
  from_status report_status,
  to_status   report_status,
  note        text,
  actor_id    text,
  actor_role  text NOT NULL DEFAULT 'ciudadano',
  public      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX report_events_report_idx ON report_events (report_id, created_at);

CREATE TABLE confirmations (
  report_id  text NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  voter      text NOT NULL,  -- user sub o hash(ip+ua)
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (report_id, voter)
);

CREATE TABLE flags (
  id         bigserial PRIMARY KEY,
  report_id  text NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  reporter   text NOT NULL,
  reason     text NOT NULL CHECK (reason IN ('falso', 'ofensivo', 'datos_personales', 'spam', 'duplicado', 'otro')),
  note       text,
  resolved   boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id, reporter)
);

CREATE TABLE subscriptions (
  report_id  text NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id    text NOT NULL,
  email      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (report_id, user_id)
);

-- Rate limiting simple por clave (ip_hash, user) y ventana.
CREATE TABLE rate_limits (
  key        text NOT NULL,
  bucket     timestamptz NOT NULL,
  hits       int NOT NULL DEFAULT 1,
  PRIMARY KEY (key, bucket)
);

-- Asigna departamento/distrito/barrio según la ubicación.
CREATE FUNCTION reports_assign_areas() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.geom IS DISTINCT FROM OLD.geom THEN
    SELECT id INTO NEW.dept_id FROM admin_areas
      WHERE level = 1 AND ST_Intersects(geom, NEW.geom) LIMIT 1;
    SELECT id INTO NEW.district_id FROM admin_areas
      WHERE level = 2 AND ST_Intersects(geom, NEW.geom) LIMIT 1;
    SELECT id INTO NEW.barrio_id FROM admin_areas
      WHERE level = 3 AND ST_Intersects(geom, NEW.geom) LIMIT 1;
  END IF;
  NEW.updated_at := now();
  IF NEW.status = 'resuelto' AND (TG_OP = 'INSERT' OR OLD.status <> 'resuelto') THEN
    NEW.resolved_at := now();
  ELSIF NEW.status <> 'resuelto' THEN
    NEW.resolved_at := NULL;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER reports_assign_areas_trg
  BEFORE INSERT OR UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION reports_assign_areas();
