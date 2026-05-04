-- ============================================================
-- 015_gym_dashboard.sql
-- Adds gym-tenant model + admin flag for the gym owner dashboard.
--
-- This migration is ADDITIVE ONLY:
--   - No existing columns are altered or dropped.
--   - No existing rows are modified.
--   - Existing RLS policies remain in force; new policies are added
--     alongside them (PostgreSQL OR-combines policies, so member
--     self-access is preserved exactly as it was).
--   - All new columns are nullable or have safe defaults.
--
-- Run this in the Supabase SQL Editor, same flow as the existing
-- migrations (see RUN_MIGRATION.md).
-- ============================================================

-- 1. Gyms table -----------------------------------------------------
CREATE TABLE IF NOT EXISTS gyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  pilot_start_date DATE,
  pilot_member_count INT DEFAULT 0 CHECK (pilot_member_count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gyms_owner_email_lower
  ON gyms ((lower(owner_email)));

-- 2. Tenant + admin flags on users (nullable / default false) -------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES gyms(id) ON DELETE SET NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Optional explicit membership anchor; falls back to users.created_at
-- when NULL. Lets you backdate pilot members for week 4 retention.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS membership_start_date DATE;

CREATE INDEX IF NOT EXISTS idx_users_gym_id ON users(gym_id);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;

-- 3. RLS for the gyms table -----------------------------------------
-- API routes use the service-role client and bypass RLS (this is the
-- existing pattern). These policies are defense-in-depth for any
-- direct anon/authenticated access through the Supabase client.
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners and admins can read their gym" ON gyms;
CREATE POLICY "Owners and admins can read their gym"
ON gyms FOR SELECT TO authenticated
USING (
  lower(owner_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  OR EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() AND u.is_admin = TRUE
  )
);

DROP POLICY IF EXISTS "Admins can manage gyms" ON gyms;
CREATE POLICY "Admins can manage gyms"
ON gyms FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_admin = TRUE)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_admin = TRUE)
);

-- 4. Tenant-scoped read policies on existing tables -----------------
-- These ADD to the existing self-access policies (e.g. migration 006).
-- They never restrict; they only OR-grant access to the gym owner and
-- to admins. Member self-read continues to work via prior policies.

DROP POLICY IF EXISTS "Gym owners and admins can read members" ON users;
CREATE POLICY "Gym owners and admins can read members"
ON users FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gyms g
    WHERE g.id = users.gym_id
      AND lower(g.owner_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  OR EXISTS (SELECT 1 FROM users u2 WHERE u2.id = auth.uid() AND u2.is_admin = TRUE)
);

DROP POLICY IF EXISTS "Gym owners and admins can read member checkins" ON daily_checkins;
CREATE POLICY "Gym owners and admins can read member checkins"
ON daily_checkins FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users u JOIN gyms g ON g.id = u.gym_id
    WHERE u.id = daily_checkins.user_id
      AND lower(g.owner_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  OR EXISTS (SELECT 1 FROM users u2 WHERE u2.id = auth.uid() AND u2.is_admin = TRUE)
);

-- ============================================================
-- POST-MIGRATION:
--   Promote yourself to admin once via SQL:
--     UPDATE users SET is_admin = TRUE WHERE email = 'you@thrivv.dev';
--
--   Verify:
--     SELECT email, is_admin FROM users WHERE is_admin = TRUE;
-- ============================================================
