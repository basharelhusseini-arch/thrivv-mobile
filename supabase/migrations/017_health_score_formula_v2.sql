-- ===================================================================
-- Migration 017: Health Score formula v2
-- ===================================================================
--
-- Adds the new component breakdown columns required by the v2 scorer
-- (Activity 50 / Recovery 15 / Sleep 15 / Food 20 / Habits 10 = 110
-- raw → normalised to 100).
--
-- Additive only. Existing columns are preserved:
--   - score, training_score, diet_score, sleep_score, habit_score
--   - whoop_recovery_points, whoop_sleep_points, whoop_activity_points
--   - habit_points, score_source                  (added in 016)
--
-- Existing flows keep working: the v2 scorer still writes the legacy
-- columns by mapping the new components proportionally so the
-- `training_score`, `diet_score`, `sleep_score`, `habit_score` CHECK
-- constraints are satisfied.
-- ===================================================================

-- v2 component breakdown ---------------------------------------------

ALTER TABLE health_scores
  ADD COLUMN IF NOT EXISTS activity_points NUMERIC;

ALTER TABLE health_scores
  ADD COLUMN IF NOT EXISTS recovery_points NUMERIC;

ALTER TABLE health_scores
  ADD COLUMN IF NOT EXISTS sleep_points NUMERIC;

ALTER TABLE health_scores
  ADD COLUMN IF NOT EXISTS recovery_sleep_points NUMERIC;

ALTER TABLE health_scores
  ADD COLUMN IF NOT EXISTS food_points NUMERIC;

ALTER TABLE health_scores
  ADD COLUMN IF NOT EXISTS raw_score NUMERIC;

ALTER TABLE health_scores
  ADD COLUMN IF NOT EXISTS max_raw_score NUMERIC DEFAULT 110;

-- ===================================================================
-- Documentation comments
-- ===================================================================

COMMENT ON COLUMN health_scores.activity_points IS
  'v2 raw activity points (0..50). WHOOP day_strain or manual workout.';

COMMENT ON COLUMN health_scores.recovery_points IS
  'v2 raw recovery points (0..15). WHOOP recovery_score or manual readiness.';

COMMENT ON COLUMN health_scores.sleep_points IS
  'v2 raw sleep points (0..15). WHOOP sleep performance/efficiency or manual hours.';

COMMENT ON COLUMN health_scores.recovery_sleep_points IS
  'Convenience: recovery_points + sleep_points (0..30). Stored for fast reads.';

COMMENT ON COLUMN health_scores.food_points IS
  'v2 raw food points (0..20). Manual nutrition / calorie target adherence.';

COMMENT ON COLUMN health_scores.raw_score IS
  'v2 unnormalised raw score (0..max_raw_score).';

COMMENT ON COLUMN health_scores.max_raw_score IS
  'v2 max raw score for the formula version used (110 for the current v2).';
