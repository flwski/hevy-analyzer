CREATE TABLE IF NOT EXISTS coach_ai_pilot (
  id integer PRIMARY KEY CHECK (id = 1),
  used bigint NOT NULL DEFAULT 0 CHECK (used >= 0)
);

INSERT INTO coach_ai_pilot (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
