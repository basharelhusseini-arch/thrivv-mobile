-- Review only. Do not apply until target database, timezone and cutover are approved.
BEGIN;
ALTER TABLE public.gyms ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';
CREATE TABLE public.health_scoring_config (
 version text PRIMARY KEY CHECK(version='health-v3'),
 -- Set explicitly before activation. NULL keeps v3 scoring disabled.
 effective_date date
);
INSERT INTO public.health_scoring_config(version) VALUES('health-v3');
ALTER TABLE public.whoop_workouts ADD COLUMN sport_name text,
 ADD COLUMN kilojoule numeric CHECK(kilojoule>=0),
 ADD COLUMN zone_durations_ms jsonb,
 ADD COLUMN score_input_valid boolean NOT NULL DEFAULT false,
 ADD COLUMN workout_score numeric CHECK(workout_score BETWEEN 0 AND 100),
 ADD COLUMN workout_breakdown jsonb;
CREATE TABLE public.health_score_days (
 user_id uuid NOT NULL REFERENCES public.users(id), date date NOT NULL,
 version text NOT NULL REFERENCES public.health_scoring_config(version),
 gym_id uuid REFERENCES public.gyms(id), timezone text NOT NULL,
 workout_score numeric CHECK(workout_score BETWEEN 0 AND 100),
 whoop_recovery numeric CHECK(whoop_recovery BETWEEN 0 AND 100),
 recovery_sleep_id uuid,
 workouts_complete boolean NOT NULL DEFAULT false,
 recovery_complete boolean NOT NULL DEFAULT false,
 training_score numeric CHECK(training_score BETWEEN 0 AND 80),
 recovery_score numeric CHECK(recovery_score BETWEEN 0 AND 20),
 habit_score numeric NOT NULL CHECK(habit_score BETWEEN 0 AND 10),
 subtotal numeric NOT NULL CHECK(subtotal BETWEEN 0 AND 110),
 score numeric CHECK(score BETWEEN 0 AND 110), complete boolean NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,date,version),
 CHECK(subtotal=coalesce(training_score,0)+coalesce(recovery_score,0)+habit_score),
 CHECK((complete AND score IS NOT NULL AND score=subtotal AND workouts_complete AND recovery_complete AND training_score IS NOT NULL AND recovery_score IS NOT NULL)
 OR (NOT complete AND score IS NULL))
);
CREATE INDEX ON public.health_score_days(gym_id,date,version,score DESC);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['health_score_days','health_scoring_config'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
 END LOOP;
END $$;
-- Habit completions now affect trusted scores: only authenticated server routes write.
REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON public.daily_checkins FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.daily_checkins TO service_role;
CREATE OR REPLACE FUNCTION public.thrivv_store_workouts(p_user uuid,p_records jsonb,p_start timestamptz,p_end timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE w jsonb; target uuid;
BEGIN
 SELECT gym_id INTO STRICT target FROM users WHERE id=p_user FOR UPDATE;
 FOR w IN SELECT value FROM jsonb_array_elements(p_records) LOOP
  IF EXISTS(SELECT 1 FROM whoop_workouts WHERE id=(w->>'id')::uuid AND user_id<>p_user) THEN
   RAISE EXCEPTION 'Workout ownership mismatch';
  END IF;
  INSERT INTO whoop_workouts(id,user_id,gym_id,start_at,end_at,duration_ms,strain,score_state,source_updated_at,sport_name,kilojoule,zone_durations_ms,score_input_valid,workout_score,workout_breakdown)
  VALUES((w->>'id')::uuid,p_user,target,(w->>'start_at')::timestamptz,(w->>'end_at')::timestamptz,
   (w->>'duration_ms')::bigint,(w->>'strain')::numeric,w->>'score_state',(w->>'source_updated_at')::timestamptz,w->>'sport_name',(w->>'kilojoule')::numeric,w->'zone_durations_ms',coalesce((w->>'score_input_valid')::boolean,false),(w->>'workout_score')::numeric,w->'workout_breakdown')
  ON CONFLICT(id) DO UPDATE SET start_at=excluded.start_at,end_at=excluded.end_at,duration_ms=excluded.duration_ms,
   strain=coalesce(excluded.strain,whoop_workouts.strain),sport_name=excluded.sport_name,
   kilojoule=coalesce(excluded.kilojoule,whoop_workouts.kilojoule),zone_durations_ms=coalesce(nullif(excluded.zone_durations_ms,'null'::jsonb),whoop_workouts.zone_durations_ms),
   score_input_valid=excluded.score_input_valid,workout_score=coalesce(excluded.workout_score,whoop_workouts.workout_score),workout_breakdown=coalesce(nullif(excluded.workout_breakdown,'null'::jsonb),whoop_workouts.workout_breakdown),score_state=excluded.score_state,source_updated_at=excluded.source_updated_at,deleted_at=NULL,updated_at=now()
  WHERE whoop_workouts.user_id=p_user AND whoop_workouts.source_updated_at<=excluded.source_updated_at;
 END LOOP;
 UPDATE whoop_workouts SET deleted_at=now() WHERE user_id=p_user AND start_at>=p_start AND start_at<p_end
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_records) AS entry(value) WHERE (entry.value->>'id')::uuid=whoop_workouts.id);

END $$;

-- Caller identity is supplied only by the server after custom-session verification.
CREATE FUNCTION public.thrivv_health_leaderboard(p_user uuid) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$
 WITH context AS (
  SELECT u.gym_id,g.timezone,(now() AT TIME ZONE g.timezone)::date AS day,c.effective_date
  FROM users u JOIN gyms g ON g.id=u.gym_id CROSS JOIN health_scoring_config c
  WHERE u.id=p_user AND c.version='health-v3'
 ), members AS (
  SELECT u.id,coalesce(nullif(trim(u.first_name||' '||u.last_name),''),'Member') AS name,
   s.score,s.training_score,s.recovery_score,s.habit_score,coalesce(s.complete,false) AS complete
  FROM context c JOIN users u ON u.gym_id=c.gym_id
  LEFT JOIN health_score_days s ON s.user_id=u.id AND s.gym_id=c.gym_id AND s.date=c.day
   AND s.version='health-v3' AND s.timezone=c.timezone AND s.date>=c.effective_date
  WHERE (u.membership_start_date IS NULL OR u.membership_start_date<=c.day)
 ), ranked AS (
  SELECT *,rank() OVER(ORDER BY score DESC) AS rank,row_number() OVER(ORDER BY score DESC,id) AS position
  FROM members WHERE complete
 ), visible AS (SELECT * FROM ranked WHERE position<=10 OR id=p_user),
 pending AS (SELECT id,name,NULL::bigint AS rank FROM members WHERE NOT complete ORDER BY id LIMIT 10)
 SELECT jsonb_build_object('hasGym',EXISTS(SELECT 1 FROM context),
  'leaderboard',coalesce((SELECT jsonb_agg(to_jsonb(v)-'position'-'complete' ORDER BY position) FROM visible v),'[]'::jsonb),
  'pending',coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM pending p),'[]'::jsonb),
  'pendingCount',(SELECT count(*) FROM members WHERE NOT complete),
  'rankedCount',(SELECT count(*) FROM ranked),
  'currentRank',(SELECT rank FROM ranked WHERE id=p_user));
$$;
REVOKE ALL ON FUNCTION public.thrivv_health_leaderboard(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.thrivv_health_leaderboard(uuid) TO service_role;
COMMIT;
