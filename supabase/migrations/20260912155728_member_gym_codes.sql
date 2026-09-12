-- Apply only after separate production approval. Requires the live WHOOP storage repair
-- and health-score tables. Do not replay the older broad migrations on that database.
BEGIN;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
-- Fail closed rather than expose new server-controlled fields through table grants.
DO $$ BEGIN
 IF has_table_privilege('anon','public.users','UPDATE') OR has_table_privilege('authenticated','public.users','UPDATE')
 OR has_table_privilege('anon','public.users','INSERT') OR has_table_privilege('authenticated','public.users','INSERT') THEN
 RAISE EXCEPTION 'Review users table grants before enabling gym codes'; END IF;
END $$;
REVOKE INSERT(gym_id,is_admin,membership_start_date), UPDATE(gym_id,is_admin,membership_start_date) ON public.users FROM PUBLIC,anon,authenticated;
CREATE TABLE public.gym_join_codes (
 gym_id uuid PRIMARY KEY REFERENCES public.gyms(id), code_hash text UNIQUE NOT NULL CHECK(code_hash ~ '^[a-f0-9]{64}$'),
 created_by uuid NOT NULL REFERENCES public.users(id), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.gym_join_attempts (
 user_id uuid PRIMARY KEY REFERENCES public.users(id), window_start timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0)
);
ALTER TABLE public.gym_join_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_join_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gym_join_codes,public.gym_join_attempts FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.gym_join_codes,public.gym_join_attempts TO service_role;
CREATE FUNCTION public.thrivv_join_gym_code(p_user uuid,p_hash text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE current_gym uuid; target uuid; gym_name text; gym_timezone text; joined_day date; tries integer;
BEGIN
 SELECT gym_id INTO STRICT current_gym FROM users WHERE id=p_user FOR UPDATE;
 INSERT INTO gym_join_attempts(user_id,attempts) VALUES(p_user,1)
 ON CONFLICT(user_id) DO UPDATE SET
 attempts=CASE WHEN gym_join_attempts.window_start<=now()-interval '15 minutes' THEN 1 ELSE least(gym_join_attempts.attempts+1,6) END,
 window_start=CASE WHEN gym_join_attempts.window_start<=now()-interval '15 minutes' THEN now() ELSE gym_join_attempts.window_start END
 RETURNING attempts INTO tries;
 IF tries>5 THEN RETURN jsonb_build_object('ok',false,'reason','limited'); END IF;
 SELECT gym_id INTO target FROM gym_join_codes WHERE code_hash=p_hash FOR SHARE;
 IF target IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','invalid'); END IF;
 IF current_gym IS NOT NULL AND current_gym<>target THEN RETURN jsonb_build_object('ok',false,'reason','membership'); END IF;
 SELECT name,timezone INTO STRICT gym_name,gym_timezone FROM gyms WHERE id=target FOR SHARE;
 joined_day=(now() AT TIME ZONE gym_timezone)::date;
 IF current_gym IS NULL THEN
  UPDATE users SET gym_id=target,membership_start_date=joined_day WHERE id=p_user;
  -- Preserve today's existing verified score when its calendar matches the gym.
  -- Earlier days stay unaffiliated; different timezones are recomputed on the next sync.
  UPDATE health_score_days SET gym_id=target WHERE user_id=p_user AND gym_id IS NULL
   AND date=joined_day AND timezone=gym_timezone;
 END IF;
 RETURN jsonb_build_object('ok',true,'gym',jsonb_build_object('id',target,'name',gym_name));
END $$;
REVOKE ALL ON FUNCTION public.thrivv_join_gym_code(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.thrivv_join_gym_code(uuid,text) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
