-- Reconciled against production on 2026-09-13: all six tables and these RPCs absent.
-- Do not replay the older secure_gym_workout_rewards migration. Existing balances are preserved.
BEGIN;
CREATE TABLE public.gym_reward_config (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 verification_enabled boolean NOT NULL DEFAULT false,
 rewards_enabled boolean NOT NULL DEFAULT false,
 effective_date date,
 points_per_health_point numeric(8,4),
 max_daily_points numeric(12,1),
 CHECK(points_per_health_point IS NULL OR points_per_health_point>0),
 CHECK(max_daily_points IS NULL OR max_daily_points>0),
 CHECK(NOT rewards_enabled OR (verification_enabled AND effective_date IS NOT NULL AND points_per_health_point IS NOT NULL AND max_daily_points IS NOT NULL))
);
INSERT INTO public.gym_reward_config(singleton) VALUES(true);
CREATE TABLE public.gym_workout_verifications (
 workout_id uuid PRIMARY KEY REFERENCES public.whoop_workouts(id),
 user_id uuid NOT NULL REFERENCES public.users(id), gym_id uuid NOT NULL REFERENCES public.gyms(id),
 operator_id uuid NOT NULL REFERENCES public.users(id), request_id uuid NOT NULL,
 score_date date NOT NULL, timezone text NOT NULL, start_at timestamptz NOT NULL, end_at timestamptz NOT NULL,
 scanned_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(user_id,request_id)
);
CREATE INDEX ON public.gym_workout_verifications(gym_id,scanned_at);
CREATE TABLE public.daily_reward_entitlements (
 user_id uuid NOT NULL REFERENCES public.users(id), score_date date NOT NULL,
 gym_id uuid NOT NULL REFERENCES public.gyms(id), timezone text NOT NULL,
 awarded numeric(12,1) NOT NULL DEFAULT 0 CHECK(awarded>=0),
 desired numeric(12,1) NOT NULL DEFAULT 0 CHECK(desired>=0),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','credited','verification_required','review_required')),
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,score_date)
);
CREATE TABLE public.reward_transactions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id),
 gym_id uuid REFERENCES public.gyms(id), score_date date,
 kind text NOT NULL CHECK(kind IN ('opening','daily_credit','daily_adjustment','redemption')),
 amount numeric NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.reward_transactions(user_id,created_at);
CREATE INDEX ON public.reward_transactions(gym_id,kind);
-- Existing balances remain untouched. No opening entries or historical ledger backfill.
CREATE TABLE public.reward_offers (
 id text PRIMARY KEY, name text NOT NULL, points numeric NOT NULL CHECK(points>0), active boolean NOT NULL DEFAULT false
);
CREATE TABLE public.reward_redemptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id),
 offer_id text NOT NULL REFERENCES public.reward_offers(id), request_id uuid NOT NULL,
 points numeric NOT NULL CHECK(points>0), status text NOT NULL DEFAULT 'pending',
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,request_id)
);
-- Empty offers: this migration does not promise partner fulfillment.
CREATE FUNCTION public.thrivv_verify_gym_workout(p_user uuid,p_workout uuid,p_gym uuid,p_operator uuid,p_issued bigint,p_expires bigint,p_request uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE u users%ROWTYPE; w whoop_workouts%ROWTYPE; v gym_workout_verifications%ROWTYPE; tz text; d date;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM gym_reward_config WHERE verification_enabled) THEN RAISE EXCEPTION 'Verification not activated'; END IF;
 SELECT * INTO STRICT u FROM users WHERE id=p_user FOR UPDATE;
 IF u.gym_id IS DISTINCT FROM p_gym THEN RAISE EXCEPTION 'Gym membership required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM users WHERE id=p_operator AND is_admin=true) AND NOT EXISTS(SELECT 1 FROM gym_operators WHERE gym_id=p_gym AND user_id=p_operator) THEN RAISE EXCEPTION 'QR operator no longer authorized'; END IF;
 IF p_issued IS NULL OR p_expires IS NULL OR p_expires-p_issued<>60 OR p_issued>extract(epoch FROM clock_timestamp()) OR p_expires<=extract(epoch FROM clock_timestamp()) THEN RAISE EXCEPTION 'QR expired'; END IF;
 SELECT * INTO STRICT w FROM whoop_workouts WHERE id=p_workout AND user_id=p_user FOR SHARE;
 IF w.deleted_at IS NOT NULL OR w.end_at>clock_timestamp() OR w.end_at<w.start_at THEN RAISE EXCEPTION 'Workout unavailable'; END IF;
 SELECT timezone INTO STRICT tz FROM gyms WHERE id=p_gym;
 d := (w.start_at AT TIME ZONE tz)::date;
 IF u.membership_start_date IS NULL OR d<u.membership_start_date THEN RAISE EXCEPTION 'Workout predates membership'; END IF;
 SELECT * INTO v FROM gym_workout_verifications WHERE workout_id=p_workout;
 IF FOUND THEN
  IF v.user_id<>p_user OR v.gym_id<>p_gym THEN RAISE EXCEPTION 'Workout already assigned'; END IF;
  IF v.start_at<>w.start_at OR v.end_at<>w.end_at OR v.timezone<>tz THEN RAISE EXCEPTION 'Workout changed; verification requires review'; END IF;
  RETURN jsonb_build_object('verified',true,'date',v.score_date);
 END IF;
 IF w.end_at<clock_timestamp()-interval '2 hours' THEN RAISE EXCEPTION 'Scan window closed'; END IF;
 INSERT INTO gym_workout_verifications(workout_id,user_id,gym_id,operator_id,request_id,score_date,timezone,start_at,end_at)
 VALUES(p_workout,p_user,p_gym,p_operator,p_request,d,tz,w.start_at,w.end_at);
 RETURN jsonb_build_object('verified',true,'date',d);
END $$;
CREATE FUNCTION public.thrivv_reconcile_gym_reward(p_user uuid,p_date date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE u users%ROWTYPE; s health_score_days%ROWTYPE; e daily_reward_entitlements%ROWTYPE; cfg gym_reward_config%ROWTYPE;
 target numeric; delta numeric; best numeric; verified boolean; tz text;
BEGIN
 SELECT * INTO STRICT u FROM users WHERE id=p_user FOR UPDATE;
 SELECT * INTO STRICT cfg FROM gym_reward_config WHERE singleton;
 IF NOT cfg.rewards_enabled OR cfg.effective_date>p_date THEN RETURN jsonb_build_object('status','not_activated'); END IF;
 SELECT * INTO e FROM daily_reward_entitlements WHERE user_id=p_user AND score_date=p_date;
 -- A membership transfer never moves a historical entitlement into the next gym.
 IF FOUND AND e.gym_id IS DISTINCT FROM u.gym_id THEN RETURN jsonb_build_object('status','historical_membership','awarded',e.awarded); END IF;
 IF u.gym_id IS NULL OR u.membership_start_date IS NULL OR p_date<u.membership_start_date THEN RETURN jsonb_build_object('status','membership_required'); END IF;
 SELECT timezone INTO STRICT tz FROM gyms WHERE id=u.gym_id;
 IF p_date>(now() AT TIME ZONE tz)::date THEN RAISE EXCEPTION 'Future date'; END IF;
 IF e.user_id IS NOT NULL AND e.timezone<>tz THEN RETURN jsonb_build_object('status','calendar_review_required'); END IF;
 -- Legacy credits require explicit reconciliation; never pay them a second time.
 IF EXISTS(SELECT 1 FROM reward_history WHERE user_id=p_user AND date=p_date AND points_earned>0) THEN RETURN jsonb_build_object('status','legacy_review_required'); END IF;
 SELECT * INTO s FROM health_score_days WHERE user_id=p_user AND date=p_date AND version='health-v3' AND gym_id=u.gym_id AND timezone=tz;
 IF NOT FOUND OR NOT s.complete OR NOT s.workouts_complete OR NOT s.recovery_complete OR s.score IS NULL THEN RETURN jsonb_build_object('status','score_pending','awarded',coalesce(e.awarded,0)); END IF;
 SELECT max(workout_score) INTO best FROM whoop_workouts WHERE user_id=p_user AND deleted_at IS NULL AND score_input_valid AND score_state='SCORED' AND end_at<=now() AND (start_at AT TIME ZONE tz)::date=p_date;
 -- A concurrent import must first finish recalculating the authoritative score.
 IF s.workout_score IS DISTINCT FROM coalesce(best,0) OR EXISTS(SELECT 1 FROM whoop_workouts WHERE user_id=p_user AND deleted_at IS NULL AND (start_at AT TIME ZONE tz)::date=p_date AND (NOT score_input_valid OR score_state<>'SCORED' OR end_at>now())) THEN RETURN jsonb_build_object('status','score_pending','awarded',coalesce(e.awarded,0)); END IF;
 SELECT EXISTS(SELECT 1 FROM whoop_workouts w JOIN gym_workout_verifications v ON v.workout_id=w.id
 WHERE w.user_id=p_user AND w.deleted_at IS NULL AND w.score_input_valid AND w.score_state='SCORED'
 AND w.workout_score=best AND (w.start_at AT TIME ZONE tz)::date=p_date
 AND v.user_id=p_user AND v.gym_id=u.gym_id AND v.timezone=tz AND v.score_date=p_date AND v.start_at=w.start_at AND v.end_at=w.end_at) INTO verified;
 -- Health Score and redeemable points remain separate. The product-approved
 -- conversion rate and cap must be configured before rewards can be enabled.
 target:=CASE WHEN verified THEN round(least(cfg.max_daily_points,greatest(0,s.score*cfg.points_per_health_point))::numeric,1) ELSE 0 END;
 INSERT INTO daily_reward_entitlements(user_id,score_date,gym_id,timezone) VALUES(p_user,p_date,u.gym_id,tz) ON CONFLICT DO NOTHING;
 SELECT * INTO STRICT e FROM daily_reward_entitlements WHERE user_id=p_user AND score_date=p_date FOR UPDATE;
 delta:=target-e.awarded;
 IF coalesce(u.reward_points,0)+delta<0 THEN
  UPDATE daily_reward_entitlements SET desired=target,status='review_required',updated_at=now() WHERE user_id=p_user AND score_date=p_date;
  RETURN jsonb_build_object('status','review_required','awarded',e.awarded);
 END IF;
 IF delta<>0 THEN
  INSERT INTO reward_transactions(user_id,gym_id,score_date,kind,amount) VALUES(p_user,e.gym_id,p_date,CASE WHEN e.awarded=0 AND delta>0 THEN 'daily_credit' ELSE 'daily_adjustment' END,delta);
  UPDATE users SET reward_points=coalesce(reward_points,0)+delta WHERE id=p_user;
 END IF;
 UPDATE daily_reward_entitlements SET awarded=target,desired=target,status=CASE WHEN verified THEN 'credited' ELSE 'verification_required' END,updated_at=now() WHERE user_id=p_user AND score_date=p_date;
 RETURN jsonb_build_object('status',CASE WHEN verified THEN 'credited' ELSE 'verification_required' END,'awarded',target);
END $$;
CREATE FUNCTION public.thrivv_redeem(p_user uuid,p_offer text,p_request uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE u users%ROWTYPE; r reward_redemptions%ROWTYPE; cost numeric;
BEGIN
 SELECT * INTO STRICT u FROM users WHERE id=p_user FOR UPDATE;
 SELECT * INTO r FROM reward_redemptions WHERE user_id=p_user AND request_id=p_request;
 IF FOUND THEN
  IF r.offer_id<>p_offer THEN RAISE EXCEPTION 'Request already used'; END IF;
  RETURN to_jsonb(r);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM gym_reward_config WHERE rewards_enabled) THEN RAISE EXCEPTION 'Rewards not activated'; END IF;
 IF EXISTS(SELECT 1 FROM daily_reward_entitlements WHERE user_id=p_user AND status='review_required') THEN RAISE EXCEPTION 'Reward correction needs review'; END IF;
 SELECT points INTO cost FROM reward_offers WHERE id=p_offer AND active FOR SHARE;
 IF cost IS NULL OR cost>coalesce(u.reward_points,0) THEN RAISE EXCEPTION 'Offer unavailable or insufficient points'; END IF;
 INSERT INTO reward_redemptions(user_id,offer_id,request_id,points) VALUES(p_user,p_offer,p_request,cost) RETURNING * INTO r;
 INSERT INTO reward_transactions(user_id,kind,amount) VALUES(p_user,'redemption',-cost);
 UPDATE users SET reward_points=coalesce(reward_points,0)-cost WHERE id=p_user;
 RETURN to_jsonb(r);
END $$;
CREATE FUNCTION public.thrivv_gym_reward_metrics(p_gym uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('earned',coalesce((SELECT sum(amount) FROM reward_transactions WHERE gym_id=p_gym AND kind IN ('daily_credit','daily_adjustment')),0),
 'scans',(SELECT count(*) FROM gym_workout_verifications WHERE gym_id=p_gym),
 'recent_scans',(SELECT count(*) FROM gym_workout_verifications WHERE gym_id=p_gym AND scanned_at>=now()-interval '7 days'));
$$;
-- Custom sessions are checked by server routes. No client has direct trusted-data access.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['gym_reward_config','gym_workout_verifications','daily_reward_entitlements','reward_transactions','reward_offers','reward_redemptions'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated,service_role',t);
  EXECUTE format('GRANT SELECT ON public.%I TO service_role',t);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.thrivv_verify_gym_workout(uuid,uuid,uuid,uuid,bigint,bigint,uuid),public.thrivv_reconcile_gym_reward(uuid,date),public.thrivv_redeem(uuid,text,uuid),public.thrivv_gym_reward_metrics(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.thrivv_verify_gym_workout(uuid,uuid,uuid,uuid,bigint,bigint,uuid),public.thrivv_reconcile_gym_reward(uuid,date),public.thrivv_redeem(uuid,text,uuid),public.thrivv_gym_reward_metrics(uuid) TO service_role;
-- Block client writes only to check-in reward inputs and legacy credit history.
-- Existing WHOOP and profile permissions are not modified.
-- Prevent identity reassignment/deletion from bypassing reward ownership.
REVOKE UPDATE(id,user_id),DELETE,TRUNCATE ON public.users FROM PUBLIC,anon,authenticated;
-- Existing custom-session server routes retain service_role access.
DO $$ DECLARE t text; c record; BEGIN
 FOREACH t IN ARRAY ARRAY['daily_checkins','reward_history'] LOOP
  EXECUTE format('REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON public.%I FROM PUBLIC,anon,authenticated',t);
  FOR c IN SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=t LOOP
   EXECUTE format('REVOKE INSERT(%I),UPDATE(%I) ON public.%I FROM PUBLIC,anon,authenticated',c.column_name,c.column_name,t);
  END LOOP;
 END LOOP;
END $$;
-- Existing history remains intact. It cannot be forged to influence reward eligibility.
ALTER TABLE public.reward_history ENABLE ROW LEVEL SECURITY;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON public.reward_history FROM PUBLIC,anon,authenticated;
CREATE TABLE public.gym_invitations (
 token_hash text PRIMARY KEY CHECK(token_hash ~ '^[a-f0-9]{64}$'),
 gym_id uuid NOT NULL REFERENCES public.gyms(id), created_by uuid NOT NULL REFERENCES public.users(id),
 expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gym_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gym_invitations FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE(revoked_at) ON public.gym_invitations TO service_role;
CREATE FUNCTION public.thrivv_accept_invitation(p_user uuid,p_hash text) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE i gym_invitations%ROWTYPE; u users%ROWTYPE; tz text;
BEGIN
 SELECT * INTO STRICT u FROM users WHERE id=p_user FOR UPDATE;
 SELECT * INTO i FROM gym_invitations WHERE token_hash=p_hash AND revoked_at IS NULL AND expires_at>clock_timestamp() FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invitation invalid or expired'; END IF;
 IF NOT EXISTS(SELECT 1 FROM users WHERE id=i.created_by AND is_admin=true)
 AND NOT EXISTS(SELECT 1 FROM gym_operators WHERE gym_id=i.gym_id AND user_id=i.created_by)
 THEN RAISE EXCEPTION 'Invitation issuer no longer authorized'; END IF;
 IF u.gym_id IS NOT NULL AND u.gym_id<>i.gym_id THEN RAISE EXCEPTION 'Already belongs to another gym'; END IF;
 SELECT timezone INTO STRICT tz FROM gyms WHERE id=i.gym_id;
 UPDATE users SET gym_id=i.gym_id,membership_start_date=CASE WHEN u.gym_id IS NULL THEN (clock_timestamp() AT TIME ZONE tz)::date ELSE coalesce(u.membership_start_date,(clock_timestamp() AT TIME ZONE tz)::date) END WHERE id=p_user;
 RETURN i.gym_id;
END $$;
REVOKE ALL ON FUNCTION public.thrivv_accept_invitation(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.thrivv_accept_invitation(uuid,text) TO service_role;
UPDATE public.gym_reward_config SET verification_enabled=true WHERE singleton;
COMMIT;
