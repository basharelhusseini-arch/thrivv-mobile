-- Completed manual logs are independent sessions; generated plan links stay intact.
ALTER TABLE public.workouts ALTER COLUMN workout_plan_id DROP NOT NULL;

COMMENT ON TABLE public.workouts IS 'Workout sessions linked to plans or independently logged by members';
