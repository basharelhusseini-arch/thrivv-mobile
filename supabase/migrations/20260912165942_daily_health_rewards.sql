-- Reviewed against ncpcosjwazjbpogugysv. Do not replay the older broad reward migration.
-- This migration creates accounting only; activation and scheduling require separate approval.
BEGIN;
CREATE TABLE public.reward_config (
 id boolean PRIMARY KEY DEFAULT true CHECK(id), enabled boolean NOT NULL DEFAULT false,
 activation_date date, score_version text NOT NULL DEFAULT 'health-v3' CHECK(score_version='health-v3'),
 CHECK(NOT enabled OR activation_date IS NOT NULL)
);
INSERT INTO public.reward_config(id) VALUES(true);
CREATE TABLE public.reward_sources (
 user_id uuid NOT NULL REFERENCES public.users(id), date date NOT NULL,
 amount numeric NOT NULL CHECK(amount BETWEEN 0 AND 110), score_version text NOT NULL,
 timezone text NOT NULL, period_start timestamptz NOT NULL, period_end timestamptz NOT NULL,
 score_updated_at timestamptz NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,date), CHECK(period_end>period_start)
);
CREATE TABLE public.reward_transactions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id),
 source_key text NOT NULL, kind text NOT NULL CHECK(kind IN ('opening','daily','adjustment','redemption')),
 amount numeric NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.reward_transactions(user_id,created_at);
-- Record actual balances, not a reconstruction from historically client-writable reward_history.
UPDATE public.users SET reward_points=0 WHERE reward_points IS NULL;
ALTER TABLE public.users ALTER COLUMN reward_points SET DEFAULT 0;
ALTER TABLE public.users ALTER COLUMN reward_points SET NOT NULL;
INSERT INTO public.reward_transactions(user_id,source_key,kind,amount)
 SELECT id,'opening','opening',reward_points FROM public.users;
CREATE TABLE public.reward_offers (
 id text PRIMARY KEY, name text NOT NULL, points numeric NOT NULL CHECK(points>0),
 active boolean NOT NULL DEFAULT false
);
-- No partner offers are invented or activated.
CREATE TABLE public.reward_redemptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id),
 offer_id text NOT NULL REFERENCES public.reward_offers(id), request_id uuid NOT NULL,
 points numeric NOT NULL CHECK(points>0), status text NOT NULL DEFAULT 'pending',
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,request_id)
);
ALTER TABLE public.health_score_days ADD COLUMN reward_verified_through timestamptz;
ALTER TABLE public.whoop_connections ADD COLUMN reward_sync_cursor date;

-- Server uses the existing verified custom JWT session, not auth.uid() assumptions.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['reward_config','reward_sources','reward_transactions','reward_offers','reward_redemptions','reward_history'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO service_role',t);
 END LOOP;
END $$;
REVOKE TRUNCATE,TRIGGER,REFERENCES ON public.users FROM PUBLIC,anon,authenticated;
REVOKE UPDATE(reward_points),INSERT(reward_points) ON public.users FROM PUBLIC,anon,authenticated;
DO $$ BEGIN
 IF has_table_privilege('anon','public.users','UPDATE') OR has_table_privilege('authenticated','public.users','UPDATE')
  OR has_table_privilege('anon','public.users','INSERT') OR has_table_privilege('authenticated','public.users','INSERT') THEN
  RAISE EXCEPTION 'Unexpected client table-wide user write grants; review before activating accounting';
 END IF;
END $$;
-- Existing profile column grants remain unchanged; clients already lack balance UPDATE/INSERT.

CREATE FUNCTION public.thrivv_reconcile_daily_rewards(p_user uuid,p_start timestamptz,p_end timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE cfg reward_config; s health_score_days; prior reward_sources; bal numeric; target numeric;
 delta numeric; credits integer=0; adjustments integer=0; held integer=0; zone text; gym uuid;
 starts timestamptz; ends timestamptz;
BEGIN
 SELECT * INTO STRICT cfg FROM reward_config WHERE id=true FOR SHARE;
 IF NOT cfg.enabled THEN RETURN jsonb_build_object('enabled',false,'credited',0); END IF;
 IF p_start IS NULL OR p_end IS NULL OR p_end>now() OR p_end<=p_start OR p_end-p_start>interval '10 days' THEN
  RAISE EXCEPTION 'Invalid verified sync window';
 END IF;
 -- Serialize credit, correction and redemption for the same member.
 SELECT u.reward_points,coalesce(g.timezone,u.timezone,'UTC'),u.gym_id INTO STRICT bal,zone,gym
 FROM users u LEFT JOIN gyms g ON g.id=u.gym_id WHERE u.id=p_user FOR UPDATE OF u;
 FOR s IN SELECT d.* FROM health_score_days d
  JOIN users u ON u.id=d.user_id JOIN health_scoring_config c ON c.version=d.version
  WHERE d.user_id=p_user AND d.version=cfg.score_version AND d.date>=cfg.activation_date AND d.date>=c.effective_date
   AND d.timezone=zone AND d.gym_id IS NOT DISTINCT FROM gym
   AND (u.membership_start_date IS NULL OR d.date>=u.membership_start_date)
   AND (d.date::timestamp AT TIME ZONE d.timezone)>=p_start
   AND ((d.date+1)::timestamp AT TIME ZONE d.timezone)<=p_end
  ORDER BY d.date FOR UPDATE OF d
 LOOP
  -- Incomplete refreshes never revoke a valid previously credited award.
  IF NOT s.complete OR NOT s.workouts_complete OR NOT s.recovery_complete OR s.score IS NULL THEN CONTINUE; END IF;
  IF s.training_score IS NULL OR s.recovery_score IS NULL OR s.habit_score IS NULL
   OR s.training_score NOT BETWEEN 0 AND 80 OR s.recovery_score NOT BETWEEN 0 AND 20
   OR s.habit_score NOT BETWEEN 0 AND 10 OR s.score NOT BETWEEN 0 AND 110
   OR s.score<>round(s.training_score+s.recovery_score+s.habit_score,1) THEN
   RAISE EXCEPTION 'Invalid stored daily score';
  END IF;
  UPDATE health_score_days SET reward_verified_through=p_end WHERE user_id=s.user_id AND date=s.date AND version=s.version;
  IF now()<(((s.date+1)::timestamp+interval '2 hours') AT TIME ZONE s.timezone) THEN CONTINUE; END IF;
  starts=s.date::timestamp AT TIME ZONE s.timezone; ends=(s.date+1)::timestamp AT TIME ZONE s.timezone;
  SELECT * INTO prior FROM reward_sources WHERE user_id=p_user AND date=s.date;
  IF FOUND THEN
   -- Timezone/gym changes must not reinterpret a previously credited calendar day.
   IF prior.timezone<>s.timezone OR prior.period_start<>starts OR prior.period_end<>ends THEN held=held+1; CONTINUE; END IF;
  ELSE
   -- Historical entries were client writable: preserve and hold conflicting dates for review.
   IF EXISTS(SELECT 1 FROM reward_history WHERE user_id=p_user AND date=s.date)
    OR EXISTS(SELECT 1 FROM reward_sources WHERE user_id=p_user AND period_start<ends AND period_end>starts) THEN
    held=held+1; CONTINUE;
   END IF;
  END IF;
  target=round(s.score,1); delta=target-coalesce(prior.amount,0);
  INSERT INTO reward_sources(user_id,date,amount,score_version,timezone,period_start,period_end,score_updated_at)
   VALUES(p_user,s.date,target,s.version,s.timezone,starts,ends,s.updated_at)
   ON CONFLICT(user_id,date) DO UPDATE SET amount=excluded.amount,score_version=excluded.score_version,
    score_updated_at=excluded.score_updated_at,updated_at=now();
  IF delta<>0 THEN
   INSERT INTO reward_transactions(user_id,source_key,kind,amount)
    VALUES(p_user,'daily:'||s.date::text,CASE WHEN prior.user_id IS NULL THEN 'daily' ELSE 'adjustment' END,delta);
   bal=bal+delta;
   IF prior.user_id IS NULL THEN credits=credits+1; ELSE adjustments=adjustments+1; END IF;
  END IF;
 END LOOP;
 -- A correction can create an internal deficit; it is never a charge to the member.
 UPDATE users SET reward_points=bal WHERE id=p_user;
 RETURN jsonb_build_object('enabled',true,'credited',credits,'adjusted',adjustments,'held',held,'available',greatest(bal,0));
END $$;
REVOKE ALL ON FUNCTION public.thrivv_reconcile_daily_rewards(uuid,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.thrivv_reconcile_daily_rewards(uuid,timestamptz,timestamptz) TO service_role;

CREATE FUNCTION public.thrivv_redeem(p_user uuid,p_offer text,p_request uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE balance numeric; cost numeric; redemption reward_redemptions;
BEGIN
 IF p_request IS NULL THEN RAISE EXCEPTION 'Request ID required'; END IF;
 SELECT reward_points INTO STRICT balance FROM users WHERE id=p_user FOR UPDATE;
 SELECT * INTO redemption FROM reward_redemptions WHERE user_id=p_user AND request_id=p_request;
 IF FOUND THEN
  IF redemption.offer_id<>p_offer THEN RAISE EXCEPTION 'Request already used'; END IF;
  RETURN to_jsonb(redemption);
 END IF;
 SELECT points INTO cost FROM reward_offers WHERE id=p_offer AND active=true FOR SHARE;
 IF cost IS NULL THEN RAISE EXCEPTION 'Offer unavailable'; END IF;
 IF balance<cost THEN RAISE EXCEPTION 'Insufficient points'; END IF;
 INSERT INTO reward_redemptions(user_id,offer_id,request_id,points) VALUES(p_user,p_offer,p_request,cost) RETURNING * INTO redemption;
 INSERT INTO reward_transactions(user_id,source_key,kind,amount) VALUES(p_user,'redeem:'||redemption.id::text,'redemption',-cost);
 UPDATE users SET reward_points=balance-cost WHERE id=p_user;
 RETURN to_jsonb(redemption);
END $$;
REVOKE ALL ON FUNCTION public.thrivv_redeem(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.thrivv_redeem(uuid,text,uuid) TO service_role;
CREATE FUNCTION public.thrivv_reward_summary(p_user uuid) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$
 WITH context AS (
  SELECT u.id,u.gym_id,u.reward_points,coalesce(g.timezone,u.timezone,'UTC') AS timezone,
   (now() AT TIME ZONE coalesce(g.timezone,u.timezone,'UTC'))::date AS day,c.enabled,c.activation_date,c.score_version
  FROM users u LEFT JOIN gyms g ON g.id=u.gym_id CROSS JOIN reward_config c WHERE u.id=p_user AND c.id=true
 ), current_score AS (
  SELECT d.* FROM health_score_days d JOIN context c ON d.user_id=c.id AND d.date=c.day
   AND d.version=c.score_version AND d.timezone=c.timezone AND d.gym_id IS NOT DISTINCT FROM c.gym_id
 )
 SELECT jsonb_build_object(
  'points',greatest(c.reward_points,0),'deficit',greatest(-c.reward_points,0),
  'enabled',c.enabled,'activationDate',c.activation_date,'date',c.day,'timezone',c.timezone,
  'healthScore',(SELECT coalesce(score,subtotal) FROM current_score),'complete',coalesce((SELECT complete FROM current_score),false),
  'creditedToday',(SELECT amount FROM reward_sources WHERE user_id=p_user AND date=c.day),
  'earnedSinceActivation',coalesce((SELECT sum(amount) FROM reward_sources WHERE user_id=p_user),0),
  'history',coalesce((SELECT jsonb_agg(to_jsonb(h) ORDER BY h.date DESC) FROM
    (SELECT date,amount,timezone,updated_at FROM reward_sources WHERE user_id=p_user ORDER BY date DESC LIMIT 30) h),'[]'::jsonb),
  'redemptions',coalesce((SELECT jsonb_agg(to_jsonb(r)) FROM
    (SELECT id,offer_id,status,created_at FROM reward_redemptions WHERE user_id=p_user ORDER BY created_at DESC) r),'[]'::jsonb),
  'offers',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'points',points)) FROM reward_offers WHERE active),'[]'::jsonb)
 ) FROM context c;
$$;
REVOKE ALL ON FUNCTION public.thrivv_reward_summary(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.thrivv_reward_summary(uuid) TO service_role;

NOTIFY pgrst,'reload schema';
COMMIT;
