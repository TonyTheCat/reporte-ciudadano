-- Ciudad de cada usuario ("Contanos de dónde sos"): define la vista inicial del mapa.
CREATE TABLE user_prefs (
  user_id     text PRIMARY KEY,                              -- Cognito sub
  district_id int NOT NULL REFERENCES admin_areas(id),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
