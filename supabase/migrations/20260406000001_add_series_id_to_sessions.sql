-- Add series_id to sessions for recurring session grouping
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS series_id uuid DEFAULT NULL;

-- Index for fast series lookup
CREATE INDEX IF NOT EXISTS sessions_series_id_idx ON sessions(series_id) WHERE series_id IS NOT NULL;

-- Add avatar_url to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text DEFAULT NULL;

-- Add history tracking to anamnesis (store snapshot array)
ALTER TABLE anamnesis ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

