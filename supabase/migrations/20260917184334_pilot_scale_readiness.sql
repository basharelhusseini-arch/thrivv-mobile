-- Forward only. No people, merchants, offers or codes are created.
BEGIN;
CREATE OR REPLACE FUNCTION thrivv_private.reconcile_manual_reward(p_user uuid,p_date date)
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
CREATE OR REPLACE FUNCTION thrivv_private.verify_manual_workout(p_user uuid,p_gym uuid,p_operator uuid,p_issued bigint,p_expires bigint,p_request uuid)
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
 IF NOT EXISTS(SELECT 1 FROM daily_checkins WHERE user_id=p_user AND date=d AND did_workout=true) THEN RAISE EXCEPTION 'Log today workout first'; END IF;
 IF EXISTS(SELECT 1 FROM daily_reward_entitlements WHERE user_id=p_user AND score_date=d AND (source<>'manual' OR gym_id<>p_gym OR timezone<>tz))
 OR EXISTS(SELECT 1 FROM reward_history WHERE user_id=p_user AND date=d AND points_earned>0) THEN RAISE EXCEPTION 'Day already has another reward source'; END IF;
 SELECT * INTO v FROM manual_gym_verifications WHERE user_id=p_user AND score_date=d;
 IF FOUND AND (v.gym_id<>p_gym OR v.timezone<>tz) THEN RAISE EXCEPTION 'Verification calendar or gym changed'; END IF;
 INSERT INTO manual_gym_verifications(user_id,score_date,gym_id,timezone,operator_id,request_id)
 VALUES(p_user,d,p_gym,tz,p_operator,p_request) ON CONFLICT(user_id,score_date) DO NOTHING;
 RETURN jsonb_build_object('verified',true,'date',d,'reward',thrivv_private.reconcile_manual_reward(p_user,d));
END $$;

-- Performance imports never mint an additional attendance award.
CREATE OR REPLACE FUNCTION public.thrivv_reconcile_gym_reward(p_user uuid,p_date date)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$
 SELECT thrivv_private.reconcile_manual_reward(p_user,p_date);
$$;
CREATE OR REPLACE FUNCTION public.thrivv_weekly_points_leaderboard(p_user uuid) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$
 WITH context AS (
  SELECT u.gym_id,g.timezone,(now() AT TIME ZONE g.timezone)::date AS day,
   date_trunc('week',now() AT TIME ZONE g.timezone)::date AS week_start
  FROM users u JOIN gyms g ON g.id=u.gym_id
  WHERE u.id=p_user
 ), members AS (
  SELECT u.id,coalesce(nullif(trim(u.first_name||' '||u.last_name),''),'Member') AS name,
   coalesce(sum(s.awarded),0) AS score,0 AS training_score,
   0 AS recovery_score,0 AS habit_score,
   count(s.score_date) AS scored_days
  FROM context c JOIN users u ON u.gym_id=c.gym_id
  LEFT JOIN daily_reward_entitlements s ON s.user_id=u.id AND s.gym_id=c.gym_id
   AND s.score_date>=c.week_start AND s.score_date<=c.day AND s.score_date<c.week_start+7
   AND s.timezone=c.timezone
   AND (u.membership_start_date IS NULL OR s.score_date>=u.membership_start_date)
   AND s.status='credited' AND s.awarded>0
  WHERE u.membership_start_date IS NULL OR u.membership_start_date<=c.day
  GROUP BY u.id,u.first_name,u.last_name
 ), ranked AS (
  SELECT *,rank() OVER(ORDER BY score DESC) AS rank,row_number() OVER(ORDER BY score DESC,id) AS position
  FROM members WHERE scored_days>0
 ), visible AS (SELECT * FROM ranked WHERE position<=10 OR id=p_user),
 pending AS (SELECT id,name,NULL::bigint AS rank FROM members WHERE scored_days=0 ORDER BY id LIMIT 10)
 SELECT jsonb_build_object('hasGym',EXISTS(SELECT 1 FROM context),'period','week','metric','earned_points','maxScore',350,
  'weekStart',(SELECT week_start FROM context),'weekEnd',(SELECT week_start+6 FROM context),
  'date',(SELECT day FROM context),'timezone',(SELECT timezone FROM context),
  'leaderboard',coalesce((SELECT jsonb_agg(to_jsonb(v)-'position' ORDER BY position) FROM visible v),'[]'::jsonb),
  'pending',coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM pending p),'[]'::jsonb),
  'pendingCount',(SELECT count(*) FROM members WHERE scored_days=0),
  'rankedCount',(SELECT count(*) FROM ranked),
  'currentRank',(SELECT rank FROM ranked WHERE id=p_user));
$$;
REVOKE ALL ON FUNCTION public.thrivv_weekly_points_leaderboard(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.thrivv_weekly_points_leaderboard(uuid) TO service_role;

ALTER TABLE public.reward_offers ADD COLUMN gym_id uuid REFERENCES public.gyms(id),
 ADD COLUMN location_label text NOT NULL DEFAULT '',
 ADD COLUMN low_stock_threshold integer NOT NULL DEFAULT 10 CHECK(low_stock_threshold BETWEEN 0 AND 1000);
ALTER TABLE public.reward_redemptions ADD COLUMN gym_id uuid REFERENCES public.gyms(id),
 ADD COLUMN resolved_at timestamptz;
-- Allocated codes remain allocated forever, including replacements and refunds.
ALTER TABLE public.reward_discount_codes DROP CONSTRAINT reward_discount_codes_redemption_id_key;
ALTER TABLE public.reward_transactions DROP CONSTRAINT reward_transactions_kind_check;
ALTER TABLE public.reward_transactions ADD CONSTRAINT reward_transactions_kind_check
 CHECK(kind IN ('opening','daily_credit','daily_adjustment','redemption','redemption_refund'));
CREATE OR REPLACE FUNCTION public.thrivv_redeem(p_user uuid,p_offer text,p_request uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE u users%ROWTYPE; r reward_redemptions%ROWTYPE; o reward_offers%ROWTYPE; c reward_discount_codes%ROWTYPE;
BEGIN
 IF p_request IS NULL THEN RAISE EXCEPTION 'Request ID required'; END IF;
 SELECT * INTO STRICT u FROM users WHERE id=p_user FOR UPDATE;
 SELECT * INTO r FROM reward_redemptions WHERE user_id=p_user AND request_id=p_request;
 IF FOUND THEN
  IF r.offer_id<>p_offer THEN RAISE EXCEPTION 'Request already used'; END IF;
  RETURN to_jsonb(r);
 END IF;
 -- One redemption per member per offer, even across tabs / new request IDs.
 SELECT * INTO r FROM reward_redemptions WHERE user_id=p_user AND offer_id=p_offer AND status<>'cancelled' ORDER BY created_at LIMIT 1;
 IF FOUND THEN RETURN to_jsonb(r); END IF;
 IF NOT EXISTS(SELECT 1 FROM gym_reward_config WHERE rewards_enabled OR manual_rewards_enabled) THEN RAISE EXCEPTION 'Rewards not activated'; END IF;
 IF EXISTS(SELECT 1 FROM daily_reward_entitlements WHERE user_id=p_user AND status='review_required') THEN RAISE EXCEPTION 'Reward correction needs review'; END IF;
 SELECT * INTO o FROM reward_offers WHERE id=p_offer AND active FOR SHARE;
 IF NOT FOUND OR o.expires_at IS NULL OR o.expires_at<=clock_timestamp() OR o.points>coalesce(u.reward_points,0) THEN RAISE EXCEPTION 'Offer unavailable or insufficient points'; END IF;
 IF o.gym_id IS NOT NULL AND o.gym_id IS DISTINCT FROM u.gym_id THEN RAISE EXCEPTION 'Offer unavailable at your branch'; END IF;
 SELECT * INTO c FROM reward_discount_codes WHERE offer_id=p_offer AND redemption_id IS NULL ORDER BY created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED;
 IF NOT FOUND THEN RAISE EXCEPTION 'No codes available'; END IF;
 INSERT INTO reward_redemptions(user_id,offer_id,request_id,points,status,discount_code,expires_at,offer_snapshot,gym_id)
 VALUES(p_user,p_offer,p_request,o.points,'issued',c.code,o.expires_at,to_jsonb(o)-'active',u.gym_id) RETURNING * INTO r;
 UPDATE reward_discount_codes SET redemption_id=r.id WHERE id=c.id;
 INSERT INTO reward_transactions(user_id,kind,amount) VALUES(p_user,'redemption',-o.points);
 UPDATE users SET reward_points=coalesce(reward_points,0)-o.points WHERE id=p_user;
 RETURN to_jsonb(r);
END $$;

CREATE OR REPLACE FUNCTION public.thrivv_reward_catalog(p_actor uuid,p_admin boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM users WHERE id=p_actor) THEN RAISE EXCEPTION 'Account unavailable'; END IF;
 IF p_admin AND NOT EXISTS(SELECT 1 FROM users WHERE id=p_actor AND is_admin=true) THEN RAISE EXCEPTION 'Admin required'; END IF;
 -- Code values never appear in the catalog, including the admin overview.
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(o) || jsonb_build_object('available',o.active AND o.expires_at>now() AND n.remaining>0)
   || CASE WHEN p_admin THEN jsonb_build_object('remaining',n.remaining,'lowStock',o.active AND n.remaining<=o.low_stock_threshold) ELSE '{}'::jsonb END ORDER BY o.name)
 FROM reward_offers o CROSS JOIN LATERAL (SELECT count(*) AS remaining FROM reward_discount_codes c WHERE c.offer_id=o.id AND c.redemption_id IS NULL) n
 WHERE p_admin OR (EXISTS(SELECT 1 FROM gym_reward_config WHERE rewards_enabled OR manual_rewards_enabled) AND o.active AND o.expires_at>now() AND (o.gym_id IS NULL OR o.gym_id=(SELECT gym_id FROM users WHERE id=p_actor)))), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.thrivv_manage_reward(p_actor uuid,p_request uuid,p_action text,p_offer text,p_reason text,p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE o reward_offers%ROWTYPE; prior admin_audit_events%ROWTYPE; points_cost integer; pct integer; category_name text; n integer;
BEGIN
 -- Serialize this admin's retries; business action and audit entry commit together.
 PERFORM 1 FROM users WHERE id=p_actor AND is_admin=true FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Admin required'; END IF;
 IF p_request IS NULL OR length(btrim(p_reason)) NOT BETWEEN 3 AND 500 OR p_reason IS NULL OR p_offer IS NULL OR length(p_offer) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid request'; END IF;
 SELECT * INTO prior FROM admin_audit_events WHERE actor_id=p_actor AND request_key=p_request;
 IF FOUND THEN
  IF prior.action<>'reward.'||p_action OR prior.after_data->>'offer_id'<>p_offer THEN RAISE EXCEPTION 'Request already used'; END IF;
  RETURN prior.after_data;
 END IF;
 IF p_action='create' THEN
  category_name:=p_data->>'category';
  points_cost:=CASE category_name WHEN 'restaurant' THEN 400 WHEN 'supplement' THEN 600 WHEN 'gym_class' THEN 800 END;
  pct:=CASE category_name WHEN 'gym_class' THEN 15 ELSE 10 END;
  IF points_cost IS NULL OR coalesce(length(p_data->>'name'),0) NOT BETWEEN 3 AND 120 OR coalesce(length(p_data->>'partner_name'),0) NOT BETWEEN 2 AND 120
   OR coalesce(length(p_data->>'terms'),0) NOT BETWEEN 3 AND 2000 OR coalesce(length(p_data->>'instructions'),0) NOT BETWEEN 3 AND 2000
   OR (p_data->>'expires_at') IS NULL OR (p_data->>'expires_at')::timestamptz<=now() THEN RAISE EXCEPTION 'Invalid offer'; END IF;
  INSERT INTO reward_offers(id,name,points,active,partner_name,category,discount_percent,terms,instructions,website_url,expires_at,gym_id,location_label)
  VALUES(p_offer,p_data->>'name',points_cost,false,p_data->>'partner_name',category_name,pct,p_data->>'terms',p_data->>'instructions',p_data->>'website_url',(p_data->>'expires_at')::timestamptz,nullif(p_data->>'gym_id','')::uuid,coalesce(p_data->>'location_label','')) RETURNING * INTO o;
 ELSIF p_action='codes' THEN
  SELECT * INTO STRICT o FROM reward_offers WHERE id=p_offer FOR UPDATE;
  IF jsonb_typeof(p_data->'codes') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid codes'; END IF;
  n:=jsonb_array_length(p_data->'codes');
  IF n NOT BETWEEN 1 AND 100 OR o.expires_at<=now() THEN RAISE EXCEPTION 'Invalid code batch'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(lower(o.partner_name),0));
  -- Reject duplicates across this partner's offers; do not recycle a used merchant code.
  IF EXISTS(SELECT 1 FROM reward_discount_codes c JOIN reward_offers other ON other.id=c.offer_id
    WHERE lower(other.partner_name)=lower(o.partner_name) AND c.code IN (SELECT jsonb_array_elements_text(p_data->'codes'))) THEN RAISE EXCEPTION 'Duplicate partner code'; END IF;
  INSERT INTO reward_discount_codes(offer_id,code) SELECT p_offer,jsonb_array_elements_text(p_data->'codes');
 ELSIF p_action='active' THEN
  SELECT * INTO STRICT o FROM reward_offers WHERE id=p_offer FOR UPDATE;
  IF jsonb_typeof(p_data->'active') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Invalid status'; END IF;
  IF (p_data->>'active')::boolean AND (p_data->>'partnerApproved' IS DISTINCT FROM 'true' OR o.expires_at IS NULL OR o.expires_at<=now()
    OR NOT EXISTS(SELECT 1 FROM reward_discount_codes WHERE offer_id=p_offer AND redemption_id IS NULL)) THEN RAISE EXCEPTION 'Partner approval and available codes required'; END IF;
  UPDATE reward_offers SET active=(p_data->>'active')::boolean WHERE id=p_offer RETURNING * INTO o;
 ELSE RAISE EXCEPTION 'Invalid action'; END IF;
 -- Never put secret codes into audit payloads.
 INSERT INTO admin_audit_events(actor_id,request_key,action,reason,after_data)
 VALUES(p_actor,p_request,'reward.'||p_action,p_reason,jsonb_build_object('offer_id',p_offer,'active',o.active,'codes_added',coalesce(n,0)));
 RETURN jsonb_build_object('offer_id',p_offer,'active',o.active,'codes_added',coalesce(n,0));
END $$;

CREATE FUNCTION public.thrivv_resolve_redemption(p_actor uuid,p_request uuid,p_redemption uuid,p_action text,p_reason text,p_reference text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE r reward_redemptions%ROWTYPE; c reward_discount_codes%ROWTYPE; prior admin_audit_events%ROWTYPE; owner_id uuid; result jsonb;
BEGIN
 PERFORM 1 FROM users WHERE id=p_actor AND is_admin FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Admin required'; END IF;
 IF p_request IS NULL OR coalesce(length(btrim(p_reason)),0) NOT BETWEEN 3 AND 500
 OR coalesce(length(btrim(p_reference)),0) NOT BETWEEN 3 AND 200 THEN RAISE EXCEPTION 'Reason and merchant reference required'; END IF;
 SELECT * INTO prior FROM admin_audit_events WHERE actor_id=p_actor AND request_key=p_request;
 IF FOUND THEN
  IF prior.action<>'redemption.'||p_action OR prior.after_data->>'id'<>p_redemption::text THEN RAISE EXCEPTION 'Request already used'; END IF;
  RETURN prior.after_data;
 END IF;
 SELECT user_id INTO STRICT owner_id FROM reward_redemptions WHERE id=p_redemption;
 PERFORM 1 FROM users WHERE id=owner_id FOR UPDATE;
 SELECT * INTO STRICT r FROM reward_redemptions WHERE id=p_redemption FOR UPDATE;
 IF r.status IN ('fulfilled','cancelled') THEN RAISE EXCEPTION 'Redemption already resolved'; END IF;
 IF p_action='used' THEN
  IF r.status<>'issued' THEN RAISE EXCEPTION 'Only issued codes can be confirmed used'; END IF;
  UPDATE reward_redemptions SET status='fulfilled',resolved_at=now() WHERE id=r.id;
 ELSIF p_action='rejected' THEN
  UPDATE reward_redemptions SET status='rejected',resolved_at=now() WHERE id=r.id;
 ELSIF p_action='refund' THEN
  INSERT INTO reward_transactions(user_id,gym_id,kind,amount) VALUES(r.user_id,r.gym_id,'redemption_refund',r.points);
  UPDATE users SET reward_points=coalesce(reward_points,0)+r.points WHERE id=r.user_id;
  UPDATE reward_redemptions SET status='cancelled',resolved_at=now() WHERE id=r.id;
 ELSIF p_action='replace' THEN
  IF r.expires_at<=now() OR r.expires_at IS NULL THEN RAISE EXCEPTION 'Expired offer: refund instead'; END IF;
  SELECT * INTO c FROM reward_discount_codes WHERE offer_id=r.offer_id AND redemption_id IS NULL ORDER BY created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RAISE EXCEPTION 'No replacement code available'; END IF;
  UPDATE reward_discount_codes SET redemption_id=r.id WHERE id=c.id;
  UPDATE reward_redemptions SET status='issued',discount_code=c.code,resolved_at=NULL WHERE id=r.id;
 ELSE RAISE EXCEPTION 'Invalid action'; END IF;
 result:=jsonb_build_object('id',r.id,'action',p_action,'merchant_reference',p_reference);
 INSERT INTO admin_audit_events(actor_id,request_key,action,reason,after_data)
 VALUES(p_actor,p_request,'redemption.'||p_action,p_reason,result);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.thrivv_resolve_redemption(uuid,uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.thrivv_resolve_redemption(uuid,uuid,uuid,text,text,text) TO service_role;

ALTER TABLE public.whoop_connections ADD COLUMN sync_attempts integer NOT NULL DEFAULT 0,
 ADD COLUMN sync_lease_id uuid, ADD COLUMN sync_lease_until timestamptz,
 ADD COLUMN last_sync_error text;
CREATE INDEX whoop_sync_due ON public.whoop_connections(next_sync_at) WHERE whoop_access_token IS NOT NULL;
CREATE FUNCTION public.thrivv_claim_sync(p_lease uuid,p_limit integer DEFAULT 3)
RETURNS TABLE(id uuid) LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$
 WITH due AS (SELECT id FROM whoop_connections WHERE whoop_access_token IS NOT NULL
  AND coalesce(next_sync_at,now())<=now() AND sync_attempts<6
  AND (sync_lease_until IS NULL OR sync_lease_until<now()) ORDER BY next_sync_at NULLS FIRST,id
  LIMIT least(greatest(p_limit,1),3) FOR UPDATE SKIP LOCKED)
 UPDATE whoop_connections w SET sync_lease_id=p_lease,sync_lease_until=now()+interval '5 minutes',sync_attempts=sync_attempts+1
 FROM due WHERE w.id=due.id RETURNING w.id;
$$;
CREATE FUNCTION public.thrivv_finish_sync(p_user uuid,p_lease uuid,p_outcome text)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$
 UPDATE whoop_connections SET sync_lease_id=NULL,sync_lease_until=NULL,
 sync_attempts=CASE WHEN p_outcome='ok' THEN 0 WHEN p_outcome='busy' THEN greatest(0,sync_attempts-1) ELSE sync_attempts END,
 last_sync_error=CASE WHEN p_outcome='ok' THEN NULL ELSE p_outcome END,
 next_sync_at=now()+CASE WHEN p_outcome='ok' THEN interval '1 hour' WHEN p_outcome='busy' THEN interval '2 minutes' ELSE least(360,5*power(2,sync_attempts-1)) * interval '1 minute' END
 WHERE id=p_user AND sync_lease_id=p_lease;
$$;
REVOKE ALL ON FUNCTION public.thrivv_claim_sync(uuid,integer),public.thrivv_finish_sync(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.thrivv_claim_sync(uuid,integer),public.thrivv_finish_sync(uuid,uuid,text) TO service_role;

ALTER TABLE public.workouts ADD COLUMN log_request_id uuid;
CREATE UNIQUE INDEX workout_log_requests ON public.workouts(member_id,log_request_id) WHERE log_request_id IS NOT NULL;

CREATE FUNCTION public.thrivv_sync_overview() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object(
 'due',(SELECT count(*) FROM whoop_connections WHERE whoop_access_token IS NOT NULL AND coalesce(next_sync_at,now())<=now() AND sync_attempts<6 AND (sync_lease_until IS NULL OR sync_lease_until<now())),
 'running',(SELECT count(*) FROM whoop_connections WHERE sync_lease_until>=now()),
 'paused',(SELECT count(*) FROM whoop_connections WHERE whoop_access_token IS NOT NULL AND sync_attempts>=6 AND (sync_lease_until IS NULL OR sync_lease_until<now())),
 'oldestDue',(SELECT min(next_sync_at) FROM whoop_connections WHERE whoop_access_token IS NOT NULL AND next_sync_at<=now() AND sync_attempts<6),
 'failures',coalesce((SELECT jsonb_agg(to_jsonb(f)) FROM (SELECT id,sync_attempts,last_sync_error FROM whoop_connections WHERE whoop_access_token IS NOT NULL AND sync_attempts>=6 AND (sync_lease_until IS NULL OR sync_lease_until<now()) ORDER BY next_sync_at LIMIT 25) f),'[]'::jsonb));
$$;
CREATE FUNCTION public.thrivv_retry_sync(p_actor uuid,p_user uuid,p_request uuid,p_reason text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM 1 FROM users WHERE id=p_actor AND is_admin FOR UPDATE;
 IF NOT FOUND OR p_request IS NULL OR coalesce(length(btrim(p_reason)),0) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'Invalid retry'; END IF;
 IF EXISTS(SELECT 1 FROM admin_audit_events WHERE actor_id=p_actor AND request_key=p_request) THEN RETURN; END IF;
 UPDATE whoop_connections SET sync_attempts=0,last_sync_error=NULL,next_sync_at=now() WHERE id=p_user AND whoop_access_token IS NOT NULL AND (sync_lease_until IS NULL OR sync_lease_until<now());
 IF NOT FOUND THEN RAISE EXCEPTION 'No retryable connection'; END IF;
 INSERT INTO admin_audit_events(actor_id,request_key,action,reason,after_data) VALUES(p_actor,p_request,'sync.retry',p_reason,jsonb_build_object('user_id',p_user));
END $$;
REVOKE ALL ON FUNCTION public.thrivv_sync_overview(),public.thrivv_retry_sync(uuid,uuid,uuid,text),public.thrivv_reconcile_gym_reward(uuid,date),thrivv_private.reconcile_manual_reward(uuid,date),thrivv_private.verify_manual_workout(uuid,uuid,uuid,bigint,bigint,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.thrivv_sync_overview(),public.thrivv_retry_sync(uuid,uuid,uuid,text),public.thrivv_reconcile_gym_reward(uuid,date),thrivv_private.reconcile_manual_reward(uuid,date),thrivv_private.verify_manual_workout(uuid,uuid,uuid,bigint,bigint,uuid) TO service_role;
CREATE FUNCTION public.thrivv_gym_pilot_analytics(p_gym uuid,p_start date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE tz text; finish date; beginning date; result jsonb;
BEGIN
 SELECT timezone INTO STRICT tz FROM gyms WHERE id=p_gym;
 finish:=(now() AT TIME ZONE tz)::date; beginning:=coalesce(p_start,finish-89);
 IF beginning>finish OR beginning<finish-365 THEN RAISE EXCEPTION 'Choose a period within the last year'; END IF;
 WITH members AS (SELECT id,membership_start_date joined FROM users WHERE gym_id=p_gym),
 visits AS (
  SELECT v.user_id,v.score_date FROM manual_gym_verifications v JOIN members m ON m.id=v.user_id WHERE v.gym_id=p_gym AND v.score_date>=m.joined AND v.score_date BETWEEN beginning AND finish
  UNION
  SELECT v.user_id,v.score_date FROM gym_workout_verifications v JOIN members m ON m.id=v.user_id WHERE v.gym_id=p_gym AND v.score_date>=m.joined AND v.score_date BETWEEN beginning AND finish
 ), cohort AS (SELECT m.*, (SELECT count(*) FROM visits v WHERE v.user_id=m.id) visits FROM members m WHERE joined BETWEEN beginning AND finish),
 weekly AS (SELECT date_trunc('week',score_date)::date week,count(*) visit_days,count(DISTINCT user_id) participants FROM visits GROUP BY 1),
 mature AS (SELECT * FROM cohort WHERE joined+27<=finish),
 receipts AS (SELECT r.*, CASE WHEN r.status='issued' AND r.expires_at<=now() THEN 'expired' ELSE r.status END current_status FROM reward_redemptions r WHERE r.gym_id=p_gym AND (r.created_at AT TIME ZONE tz)::date BETWEEN beginning AND finish)
 SELECT jsonb_build_object('from',beginning,'to',finish,'timezone',tz,'members',(SELECT count(*) FROM members),
 'joined',(SELECT count(*) FROM cohort),'firstVerified',(SELECT count(*) FROM cohort WHERE visits>=1),'repeatVisitors',(SELECT count(*) FROM cohort WHERE visits>=2),
 'firstReward',(SELECT count(*) FROM cohort c WHERE EXISTS(SELECT 1 FROM receipts r WHERE r.user_id=c.id AND (r.created_at AT TIME ZONE tz)::date>=c.joined)),
 'verifiedVisitDays',(SELECT count(*) FROM visits),'verifiedParticipants',(SELECT count(DISTINCT user_id) FROM visits),
 'visitsPerMemberWeek',round((SELECT count(*) FROM visits)::numeric/nullif((SELECT sum(finish-greatest(joined,beginning)+1) FROM members WHERE joined<=finish),0)*7,2),
 'week4Eligible',(SELECT count(*) FROM mature),'week4Participating',(SELECT count(*) FROM mature m WHERE EXISTS(SELECT 1 FROM visits v WHERE v.user_id=m.id AND v.score_date BETWEEN m.joined+21 AND m.joined+27)),
 'codesIssued',(SELECT count(*) FROM receipts),'confirmedUse',(SELECT count(*) FROM receipts WHERE current_status='fulfilled'),
 'rejected',(SELECT count(*) FROM receipts WHERE current_status='rejected'),'expired',(SELECT count(*) FROM receipts WHERE current_status='expired'),'refunded',(SELECT count(*) FROM receipts WHERE current_status='cancelled'),
 'weekly',coalesce((SELECT jsonb_agg(to_jsonb(w) ORDER BY week) FROM weekly w),'[]'::jsonb),
 'unknownMembershipDates',(SELECT count(*) FROM members WHERE joined IS NULL)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.thrivv_gym_pilot_analytics(uuid,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.thrivv_gym_pilot_analytics(uuid,date) TO service_role;
CREATE INDEX reward_redemptions_gym_created ON public.reward_redemptions(gym_id,created_at);
CREATE INDEX manual_gym_visits_date ON public.manual_gym_verifications(gym_id,score_date,user_id);
CREATE INDEX whoop_gym_visits_date ON public.gym_workout_verifications(gym_id,score_date,user_id);

CREATE TABLE public.member_reminder_preferences (
 user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
 available_rewards boolean NOT NULL DEFAULT false,
 voucher_expiry boolean NOT NULL DEFAULT false,
 weekly_target smallint NOT NULL DEFAULT 0 CHECK(weekly_target BETWEEN 0 AND 7),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.member_reminder_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_reminder_preferences FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.member_reminder_preferences TO service_role;
CREATE FUNCTION public.thrivv_member_reminders(p_user uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE u users%ROWTYPE; prefs member_reminder_preferences%ROWTYPE; tz text; d date; visits integer; result jsonb:='[]'::jsonb; scheduled jsonb:='[]'::jsonb; r record; offer jsonb; target_at timestamptz;
BEGIN
 SELECT * INTO STRICT u FROM users WHERE id=p_user;
 SELECT * INTO prefs FROM member_reminder_preferences WHERE user_id=p_user;
 SELECT timezone INTO tz FROM gyms WHERE id=u.gym_id; tz:=coalesce(tz,u.timezone,'UTC'); d:=(now() AT TIME ZONE tz)::date;
 IF prefs.available_rewards THEN
  FOR offer IN SELECT value FROM jsonb_array_elements(public.thrivv_reward_catalog(p_user,false)) WHERE (value->>'available')::boolean AND (value->>'points')::numeric<=coalesce(u.reward_points,0)
   AND NOT EXISTS(SELECT 1 FROM reward_redemptions WHERE user_id=p_user AND offer_id=value->>'id' AND status<>'cancelled') LIMIT 3 LOOP
   result:=result||jsonb_build_array(jsonb_build_object('id','offer:'||(offer->>'id'),'title','A reward is available','body',offer->>'name','href','/member/rewards'));
  END LOOP;
 END IF;
 IF prefs.voucher_expiry THEN
  FOR r IN SELECT id,expires_at FROM reward_redemptions WHERE user_id=p_user AND status='issued' AND expires_at>now() AND expires_at<=now()+interval '7 days' ORDER BY expires_at LIMIT 5 LOOP
   result:=result||jsonb_build_array(jsonb_build_object('id','expiry:'||r.id,'title','Check your voucher expiry','body','A saved voucher expires on '||to_char(r.expires_at AT TIME ZONE tz,'DD Mon HH24:MI')||' ('||tz||').','href','/member/rewards'));
   IF r.expires_at-interval '1 day'>now() THEN
    scheduled:=scheduled||jsonb_build_array(jsonb_build_object('id','expiry:'||r.id,'kind','expiry','at',r.expires_at-interval '1 day'));
   END IF;
  END LOOP;
 END IF;
 IF prefs.weekly_target>0 AND u.gym_id IS NOT NULL THEN
  SELECT count(*) INTO visits FROM (SELECT score_date FROM manual_gym_verifications WHERE user_id=p_user AND gym_id=u.gym_id AND score_date BETWEEN date_trunc('week',d)::date AND d
   UNION SELECT score_date FROM gym_workout_verifications WHERE user_id=p_user AND gym_id=u.gym_id AND score_date BETWEEN date_trunc('week',d)::date AND d) v;
  result:=result||jsonb_build_array(jsonb_build_object('id','weekly:'||date_trunc('week',d)::date,'title','Your weekly attendance target','body',visits||' of '||prefs.weekly_target||' chosen visit days recorded.','href','/member/scan-workout'));
  target_at:=(date_trunc('week',d::timestamp)+interval '5 days 18 hours') AT TIME ZONE tz;
  IF target_at>now() AND visits<prefs.weekly_target THEN scheduled:=scheduled||jsonb_build_array(jsonb_build_object('id','weekly:'||d,'kind','weekly','at',target_at)); END IF;
 END IF;
 RETURN jsonb_build_object('preferences',jsonb_build_object('available_rewards',coalesce(prefs.available_rewards,false),'voucher_expiry',coalesce(prefs.voucher_expiry,false),'weekly_target',coalesce(prefs.weekly_target,0)),'reminders',result,'scheduled',scheduled);
END $$;
REVOKE ALL ON FUNCTION public.thrivv_member_reminders(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.thrivv_member_reminders(uuid) TO service_role;

COMMIT;
NOTIFY pgrst,'reload schema';
