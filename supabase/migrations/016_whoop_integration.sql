-- ============================================================
-- 016_whoop_integration.sql
-- Adds WHOOP OAuth + per-day WHOOP data + hybrid health-score
-- breakdown columns.
--
-- This migration is ADDITIVE ONLY:
--   - No existing columns are altered or dropped.
--   - No existing rows are modified.
--   - All new columns are nullable or have safe defaults.
--   - Existing RLS policies remain in force; new policies are
--     added alongside them.
--   - The existing 110-scale health-score breakdown
--     (training_score, diet_score, sleep_score, habit_score) is
--     preserved untouched. New whoop_*_points and habit_points
--     columns store the parallel WHOOP-derived breakdown so the
--     dashboard's existing `score` column continues to be the
--     single read target.
--
-- Auth note:
--   This project uses a custom JWT session (lib/auth.ts) and a
--   custom `users` table; it does NOT use Supabase Auth. All
--   server-side data access goes through the service-role
--   client and bypasses RLS. RLS policies on whoop_data are
--   therefore defense-in-depth for any future direct anon /
--   authenticated access via the Supabase JS client. They mirror
--   the convention used in migration 006 / 015.
--
-- Run this in the Supabase SQL Editor, same flow as the prior
-- migrations.
-- ============================================================

-- 1. WHOOP OAuth token columns on the users table -------------------
-- Tokens are server-only; they are never returned to the browser.
-- All five columns are nullable so existing rows stay valid.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS whoop_user_id BIGINT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS whoop_access_token TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS whoop_refresh_token TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS whoop_token_expires_at TIMESTAMPTZ;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS whoop_connected_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_whoop_connected
  ON users (whoop_connected_at)
  WHERE whoop_connected_at IS NOT NULL;

-- 2. Per-day WHOOP data table ---------------------------------------
-- One row per (user, date). Raw WHOOP payload is kept as JSONB for
-- future analytics; never returned to the browser by the API.

CREATE TABLE IF NOT EXISTS whoop_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  recovery_score NUMERIC,
  hrv NUMERIC,
  resting_hr NUMERIC,

  sleep_performance_pct NUMERIC,
  sleep_efficiency_pct NUMERIC,
  total_sleep_ms BIGINT,

  day_strain NUMERIC,
  kilojoules NUMERIC,

  raw_payload JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_whoop_user_date UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_whoop_data_user_id ON whoop_data (user_id);
CREATE INDEX IF NOT EXISTS idx_whoop_data_date ON whoop_data (date DESC);
CREATE INDEX IF NOT EXISTS idx_whoop_data_user_date
  ON whoop_data (user_id, date DESC);

-- 3. RLS for whoop_data --------------------------------------------
-- API routes hit this table via the service-role client and bypass
-- RLS. These policies match the convention in migration 006: any
-- direct authenticated client can only see its own rows.

ALTER TABLE whoop_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select their own whoop_data" ON whoop_data;
CREATE POLICY "Users can select their own whoop_data"
ON whoop_data FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own whoop_data" ON whoop_data;
CREATE POLICY "Users can insert their own whoop_data"
ON whoop_data FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own whoop_data" ON whoop_data;
CREATE POLICY "Users can update their own whoop_data"
ON whoop_data FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own whoop_data" ON whoop_data;
CREATE POLICY "Users can delete their own whoop_data"
ON whoop_data FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- 4. updated_at trigger for whoop_data -----------------------------
-- Keeps updated_at fresh on every UPDATE without forcing every
-- caller to set it explicitly.

CREATE OR REPLACE FUNCTION whoop_data_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_whoop_data_updated_at ON whoop_data;
CREATE TRIGGER trg_whoop_data_updated_at
BEFORE UPDATE ON whoop_data
FOR EACH ROW EXECUTE FUNCTION whoop_data_set_updated_at();

-- 5. Hybrid score breakdown columns on health_scores ---------------
-- The existing 110-scale columns (training_score, diet_score,
-- sleep_score, habit_score) keep telling the manual story. These
-- new nullable columns store the parallel WHOOP-aware 100-scale
-- breakdown (Recovery 30 + Sleep 30 + Activity 25 + Habits 15).
-- The dashboard continues to read the single `score` column, which
-- the WHOOP sync route updates with the hybrid score whenever WHOOP
-- data is available for that date.

ALTER TABLE health_scores
  ADD COLUMN IF NOT EXISTS whoop_recovery_points NUMERIC;

ALTER TABLE health_scores
  ADD COLUMN IF NOT EXISTS whoop_sleep_points NUMERIC;

ALTER TABLE health_scores
  ADD COLUMN IF NOT EXISTS whoop_activity_points NUMERIC;

ALTER TABLE health_scores
  ADD COLUMN IF NOT EXISTS habit_points NUMERIC;

ALTER TABLE health_scores
  ADD COLUMN IF NOT EXISTS score_source TEXT
  CHECK (score_source IN ('manual', 'whoop', 'hybrid'));

-- ============================================================
-- POST-MIGRATION VERIFICATION:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'users' AND column_name LIKE 'whoop_%';
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'health_scores'
--     AND column_name IN ('whoop_recovery_points',
--                         'whoop_sleep_points',
--                         'whoop_activity_points',
--                         'habit_points',
--                         'score_source');
--
--   SELECT count(*) FROM whoop_data;  -- should be 0 initially
-- ============================================================
