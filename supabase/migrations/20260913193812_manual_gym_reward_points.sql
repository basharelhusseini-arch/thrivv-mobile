-- Forward-only manual rewards. No WHOOP conversion or historical awards.
BEGIN;
ALTER TABLE public.gym_reward_config ADD COLUMN manual_rewards_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.gym_reward_config ADD COLUMN manual_effective_at timestamptz NOT NULL DEFAULT clock_timestamp();
ALTER TABLE public.daily_reward_entitlements ADD COLUMN source text NOT NULL DEFAULT 'whoop' CHECK(source IN ('manual','whoop'));
CREATE TABLE public.manual_gym_verifications (
 user_id uuid NOT NULL REFERENCES public.users(id), score_date date NOT NULL,
 gym_id uuid NOT NULL REFERENCES public.gyms(id), timezone text NOT NULL,
 operator_id uuid NOT NULL REFERENCES public.users(id), request_id uuid NOT NULL,
 scanned_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(user_id,score_date), UNIQUE(user_id,request_id)
);
CREATE INDEX ON public.manual_gym_verifications(gym_id,scanned_at);
ALTER TABLE public.manual_gym_verifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.manual_gym_verifications FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.manual_gym_verifications TO service_role;
-- Private implementations hold immutable ledger write privileges. Public wrappers
-- are invoker-only, server-role-only; Thrivv uses custom session authentication.
CREATE SCHEMA IF NOT EXISTS thrivv_private;
REVOKE ALL ON SCHEMA thrivv_private FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA thrivv_private TO service_role;
CREATE FUNCTION thrivv_private.reconcile_manual_reward(p_user uuid,p_date date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE u users%ROWTYPE; v manual_gym_verifications%ROWTYPE; e daily_reward_entitlements%ROWTYPE; cfg gym_reward_config%ROWTYPE;
 h jsonb; bonus numeric; target numeric; delta numeric;
BEGIN
 SELECT * INTO STRICT u FROM users WHERE id=p_user FOR UPDATE;
 SELECT * INTO STRICT cfg FROM gym_reward_config WHERE singleton;
 IF NOT cfg.manual_rewards_enabled OR NOT cfg.verification_enabled THEN RETURN jsonb_build_object('status','not_activated'); END IF;
 SELECT * INTO v FROM manual_gym_verifications WHERE user_id=p_user AND score_date=p_date;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','verification_required'); END IF;
 IF v.scanned_at<cfg.manual_effective_at OR p_date<>(clock_timestamp() AT TIME ZONE v.timezone)::date THEN RETURN jsonb_build_object('status','outside_today'); END IF;
 IF u.gym_id IS DISTINCT FROM v.gym_id OR u.membership_start_date IS NULL OR p_date<u.membership_start_date
 OR NOT EXISTS(SELECT 1 FROM gyms WHERE id=v.gym_id AND timezone=v.timezone) THEN RETURN jsonb_build_object('status','membership_review_required'); END IF;
 SELECT * INTO e FROM daily_reward_entitlements WHERE user_id=p_user AND score_date=p_date;
 IF FOUND AND (e.source<>'manual' OR e.gym_id<>v.gym_id OR e.timezone<>v.timezone) THEN RETURN jsonb_build_object('status','other_reward_source'); END IF;
 IF EXISTS(SELECT 1 FROM reward_history WHERE user_id=p_user AND date=p_date AND points_earned>0) THEN RETURN jsonb_build_object('status','legacy_review_required'); END IF;
 -- A later WHOOP connection/import cannot increase or overwrite a manual award.
 IF EXISTS(SELECT 1 FROM whoop_connections WHERE id=p_user AND whoop_connected_at IS NOT NULL)
 OR EXISTS(SELECT 1 FROM whoop_workouts WHERE user_id=p_user AND (start_at AT TIME ZONE v.timezone)::date=p_date) THEN
 RETURN jsonb_build_object('status','whoop_ineligible','awarded',coalesce(e.awarded,0)); END IF;
 SELECT habit_details INTO h FROM daily_checkins WHERE user_id=p_user AND date=p_date;
 SELECT round(10.0*count(*)/6,1) INTO bonus FROM unnest(ARRAY['sauna','steamRoom','iceBath','coldShower','meditation','stretching']) k WHERE h->k='true'::jsonb;
 target:=40+bonus;
 INSERT INTO daily_reward_entitlements(user_id,score_date,gym_id,timezone,source) VALUES(p_user,p_date,v.gym_id,v.timezone,'manual') ON CONFLICT DO NOTHING;
 SELECT * INTO STRICT e FROM daily_reward_entitlements WHERE user_id=p_user AND score_date=p_date FOR UPDATE;
 delta:=target-e.awarded;
 IF coalesce(u.reward_points,0)+delta<0 THEN
 UPDATE daily_reward_entitlements SET desired=target,status='review_required',updated_at=clock_timestamp() WHERE user_id=p_user AND score_date=p_date;
 RETURN jsonb_build_object('status','review_required','awarded',e.awarded,'earned',0,'total',u.reward_points); END IF;
 IF delta<>0 THEN
 INSERT INTO reward_transactions(user_id,gym_id,score_date,kind,amount) VALUES(p_user,v.gym_id,p_date,CASE WHEN e.awarded=0 THEN 'daily_credit' ELSE 'daily_adjustment' END,delta);
 UPDATE users SET reward_points=coalesce(reward_points,0)+delta WHERE id=p_user;
 END IF;
 UPDATE daily_reward_entitlements SET awarded=target,desired=target,status='credited',updated_at=clock_timestamp() WHERE user_id=p_user AND score_date=p_date;
 RETURN jsonb_build_object('status','credited','awarded',target,'earned',delta,'total',coalesce(u.reward_points,0)+delta);
END $$;
CREATE FUNCTION thrivv_private.verify_manual_workout(p_user uuid,p_gym uuid,p_operator uuid,p_issued bigint,p_expires bigint,p_request uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE u users%ROWTYPE; cfg gym_reward_config%ROWTYPE; tz text; d date; v manual_gym_verifications%ROWTYPE;
BEGIN
 SELECT * INTO STRICT u FROM users WHERE id=p_user FOR UPDATE;
 SELECT * INTO STRICT cfg FROM gym_reward_config WHERE singleton;
 IF NOT cfg.manual_rewards_enabled OR NOT cfg.verification_enabled THEN RAISE EXCEPTION 'Manual rewards not activated'; END IF;
 IF u.gym_id IS DISTINCT FROM p_gym THEN RAISE EXCEPTION 'Gym membership required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM users WHERE id=p_operator AND is_admin=true)
 AND NOT EXISTS(SELECT 1 FROM gym_operators WHERE gym_id=p_gym AND user_id=p_operator) THEN RAISE EXCEPTION 'QR operator no longer authorized'; END IF;
 IF p_request IS NULL OR p_issued IS NULL OR p_expires IS NULL OR p_expires-p_issued<>60 OR p_issued>extract(epoch FROM clock_timestamp()) OR p_expires<=extract(epoch FROM clock_timestamp()) THEN RAISE EXCEPTION 'QR expired'; END IF;
 SELECT timezone INTO STRICT tz FROM gyms WHERE id=p_gym;
 d:=(clock_timestamp() AT TIME ZONE tz)::date;
 IF u.membership_start_date IS NULL OR d<u.membership_start_date THEN RAISE EXCEPTION 'Membership required'; END IF;
 IF EXISTS(SELECT 1 FROM whoop_connections WHERE id=p_user AND whoop_connected_at IS NOT NULL)
 OR EXISTS(SELECT 1 FROM whoop_workouts WHERE user_id=p_user AND (start_at AT TIME ZONE tz)::date=d) THEN RAISE EXCEPTION 'Use WHOOP workout verification'; END IF;
 IF NOT EXISTS(SELECT 1 FROM daily_checkins WHERE user_id=p_user AND date=d AND did_workout=true) THEN RAISE EXCEPTION 'Log today workout first'; END IF;
 IF EXISTS(SELECT 1 FROM daily_reward_entitlements WHERE user_id=p_user AND score_date=d AND (source<>'manual' OR gym_id<>p_gym OR timezone<>tz))
 OR EXISTS(SELECT 1 FROM reward_history WHERE user_id=p_user AND date=d AND points_earned>0) THEN RAISE EXCEPTION 'Day already has another reward source'; END IF;
 SELECT * INTO v FROM manual_gym_verifications WHERE user_id=p_user AND score_date=d;
 IF FOUND AND (v.gym_id<>p_gym OR v.timezone<>tz) THEN RAISE EXCEPTION 'Verification calendar or gym changed'; END IF;
 INSERT INTO manual_gym_verifications(user_id,score_date,gym_id,timezone,operator_id,request_id)
 VALUES(p_user,d,p_gym,tz,p_operator,p_request) ON CONFLICT(user_id,score_date) DO NOTHING;
 RETURN jsonb_build_object('verified',true,'date',d,'reward',thrivv_private.reconcile_manual_reward(p_user,d));
END $$;
CREATE FUNCTION public.thrivv_verify_manual_workout(p_user uuid,p_gym uuid,p_operator uuid,p_issued bigint,p_expires bigint,p_request uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$
 SELECT thrivv_private.verify_manual_workout(p_user,p_gym,p_operator,p_issued,p_expires,p_request);
$$;
REVOKE ALL ON FUNCTION thrivv_private.reconcile_manual_reward(uuid,date),thrivv_private.verify_manual_workout(uuid,uuid,uuid,bigint,bigint,uuid),public.thrivv_verify_manual_workout(uuid,uuid,uuid,bigint,bigint,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION thrivv_private.reconcile_manual_reward(uuid,date),thrivv_private.verify_manual_workout(uuid,uuid,uuid,bigint,bigint,uuid),public.thrivv_verify_manual_workout(uuid,uuid,uuid,bigint,bigint,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.thrivv_reconcile_gym_reward(p_user uuid,p_date date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE u users%ROWTYPE; s health_score_days%ROWTYPE; e daily_reward_entitlements%ROWTYPE; cfg gym_reward_config%ROWTYPE;
 target numeric; delta numeric; best numeric; verified boolean; tz text;
BEGIN
 SELECT * INTO STRICT u FROM users WHERE id=p_user FOR UPDATE;
 SELECT * INTO STRICT cfg FROM gym_reward_config WHERE singleton;
 IF EXISTS(SELECT 1 FROM manual_gym_verifications WHERE user_id=p_user AND score_date=p_date) THEN
 RETURN thrivv_private.reconcile_manual_reward(p_user,p_date); END IF;
 IF EXISTS(SELECT 1 FROM daily_reward_entitlements WHERE user_id=p_user AND score_date=p_date AND source='manual') THEN RETURN jsonb_build_object('status','other_reward_source'); END IF;
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
CREATE OR REPLACE FUNCTION public.thrivv_redeem(p_user uuid,p_offer text,p_request uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE u users%ROWTYPE; r reward_redemptions%ROWTYPE; cost numeric;
BEGIN
 SELECT * INTO STRICT u FROM users WHERE id=p_user FOR UPDATE;
 SELECT * INTO r FROM reward_redemptions WHERE user_id=p_user AND request_id=p_request;
 IF FOUND THEN
  IF r.offer_id<>p_offer THEN RAISE EXCEPTION 'Request already used'; END IF;
  RETURN to_jsonb(r);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM gym_reward_config WHERE rewards_enabled OR manual_rewards_enabled) THEN RAISE EXCEPTION 'Rewards not activated'; END IF;
 IF EXISTS(SELECT 1 FROM daily_reward_entitlements WHERE user_id=p_user AND status='review_required') THEN RAISE EXCEPTION 'Reward correction needs review'; END IF;
 SELECT points INTO cost FROM reward_offers WHERE id=p_offer AND active FOR SHARE;
 IF cost IS NULL OR cost>coalesce(u.reward_points,0) THEN RAISE EXCEPTION 'Offer unavailable or insufficient points'; END IF;
 INSERT INTO reward_redemptions(user_id,offer_id,request_id,points) VALUES(p_user,p_offer,p_request,cost) RETURNING * INTO r;
 INSERT INTO reward_transactions(user_id,kind,amount) VALUES(p_user,'redemption',-cost);
 UPDATE users SET reward_points=coalesce(reward_points,0)-cost WHERE id=p_user;
 RETURN to_jsonb(r);
END $$;
CREATE OR REPLACE FUNCTION public.thrivv_gym_reward_metrics(p_gym uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('earned',coalesce((SELECT sum(amount) FROM reward_transactions WHERE gym_id=p_gym AND kind IN ('daily_credit','daily_adjustment')),0),
 'scans',((SELECT count(*) FROM gym_workout_verifications WHERE gym_id=p_gym)+(SELECT count(*) FROM manual_gym_verifications WHERE gym_id=p_gym)),
 'recent_scans',((SELECT count(*) FROM gym_workout_verifications WHERE gym_id=p_gym AND scanned_at>=now()-interval '7 days')+(SELECT count(*) FROM manual_gym_verifications WHERE gym_id=p_gym AND scanned_at>=now()-interval '7 days')));
$$;

COMMIT;
