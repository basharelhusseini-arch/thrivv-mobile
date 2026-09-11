-- Review against the VERIFIED deployment database before applying.
-- No existing migration is replayed. Apply as one transaction.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gyms (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
 owner_email text NOT NULL, pilot_start_date date, pilot_member_count integer DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gym_id uuid REFERENCES public.gyms(id);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS membership_start_date date;
-- Missing balances can only be reconstructed after explicit reconciliation.
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='reward_points')
 AND EXISTS (SELECT 1 FROM public.reward_history WHERE points_earned <> 0) THEN
 RAISE EXCEPTION 'Existing reward history without balances: reconcile before migration';
 END IF;
END $$;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reward_points numeric NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_users_gym_id ON public.users(gym_id);

CREATE TABLE public.whoop_connections (
 id uuid PRIMARY KEY REFERENCES public.users(id),
 whoop_user_id bigint UNIQUE, whoop_access_token text, whoop_refresh_token text,
 whoop_token_expires_at timestamptz, whoop_connected_at timestamptz,
 next_sync_at timestamptz NOT NULL DEFAULT now(), last_sync_at timestamptz
);
INSERT INTO public.whoop_connections (id,whoop_user_id,whoop_access_token,whoop_refresh_token,whoop_token_expires_at,whoop_connected_at)
SELECT id,whoop_user_id,whoop_access_token,whoop_refresh_token,whoop_token_expires_at,whoop_connected_at FROM public.users;
-- Remove token copies only after they have been copied successfully in this transaction.
UPDATE public.users SET whoop_access_token=NULL,whoop_refresh_token=NULL;
CREATE TABLE public.whoop_workouts (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES public.users(id),
 gym_id uuid REFERENCES public.gyms(id), start_at timestamptz NOT NULL, end_at timestamptz NOT NULL,
 duration_ms bigint NOT NULL CHECK(duration_ms>=0), strain numeric CHECK(strain BETWEEN 0 AND 21),
 score_state text NOT NULL CHECK(score_state IN ('SCORED','PENDING_SCORE','UNSCORABLE')),
 source_updated_at timestamptz NOT NULL, deleted_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(), CHECK(end_at>=start_at)
);
CREATE INDEX ON public.whoop_workouts(user_id,start_at);
CREATE INDEX ON public.whoop_workouts(gym_id,start_at);
CREATE TABLE public.whoop_sync_locks (
 user_id uuid PRIMARY KEY REFERENCES public.users(id), owner uuid NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE public.reward_sources (
 user_id uuid NOT NULL REFERENCES public.users(id), source_key text NOT NULL,
 amount numeric NOT NULL CHECK(amount>=0), PRIMARY KEY(user_id,source_key)
);
CREATE TABLE public.reward_transactions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id),
 source_key text NOT NULL, amount numeric NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.reward_transactions(user_id,created_at);
-- Opening entry preserves the actual balance, including any pre-existing debits.
INSERT INTO public.reward_transactions(user_id,source_key,amount)
SELECT id,'opening',coalesce(reward_points,0) FROM public.users;
INSERT INTO public.reward_sources(user_id,source_key,amount)
SELECT user_id,'daily:'||date::text,points_earned FROM public.reward_history;
CREATE TABLE public.reward_offers (
 id text PRIMARY KEY, name text NOT NULL, points numeric NOT NULL CHECK(points>0),
 active boolean NOT NULL DEFAULT false
);
-- Offers are deliberately NOT seeded: confirm actual partner offers before enabling.
CREATE TABLE public.reward_redemptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id),
 offer_id text NOT NULL REFERENCES public.reward_offers(id), request_id uuid NOT NULL,
 points numeric NOT NULL CHECK(points>0), status text NOT NULL DEFAULT 'pending',
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,request_id)
);
CREATE TABLE public.gym_invitations (
 token_hash text PRIMARY KEY, gym_id uuid NOT NULL REFERENCES public.gyms(id),
 created_by uuid NOT NULL REFERENCES public.users(id), expires_at timestamptz NOT NULL,
 revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);

-- Sensitive records are only accessed through verified server sessions.
-- These grants do not rely on custom JWTs being understood by Supabase RLS.
DO $$ DECLARE t text; p record; BEGIN
 FOREACH t IN ARRAY ARRAY['gyms','whoop_connections','whoop_workouts','whoop_sync_locks','reward_sources','reward_transactions','reward_offers','reward_redemptions','gym_invitations','reward_history','whoop_data','health_scores','verification_events'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated, PUBLIC',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
 END LOOP;
 -- Remove unsafe policies, including recursive gym policies from old migration 015.
 FOR p IN SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' AND
 (tablename IN ('gyms','whoop_data','health_scores','verification_events','reward_history')
 OR (tablename IN ('users','daily_checkins') AND policyname LIKE 'Gym owners%')) LOOP
  EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,p.tablename);
 END LOOP;
END $$;
-- Never allow direct profile writes to change identity, credentials or tenant/admin fields.
REVOKE ALL ON public.users FROM anon, authenticated, PUBLIC;
GRANT SELECT(id,first_name,last_name,email,created_at,user_id) ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

CREATE FUNCTION public.thrivv_lock_sync(p_user uuid,p_owner uuid) RETURNS boolean
LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$
 WITH claimed AS (
 INSERT INTO whoop_sync_locks(user_id,owner,expires_at) VALUES(p_user,p_owner,now()+interval '5 minutes')
 ON CONFLICT(user_id) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at
 WHERE whoop_sync_locks.expires_at<now() RETURNING 1
 ) SELECT EXISTS(SELECT 1 FROM claimed);
$$;
CREATE FUNCTION public.thrivv_release_sync(p_user uuid,p_owner uuid) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$
 DELETE FROM whoop_sync_locks WHERE user_id=p_user AND owner=p_owner;
$$;

CREATE FUNCTION public.thrivv_credit_daily(p_user uuid,p_date date,p_health integer,p_confidence integer,p_total integer,p_multiplier numeric,p_amount numeric)
RETURNS numeric LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE previous numeric; balance numeric; delta numeric; k text='daily:'||p_date::text;
BEGIN
 IF p_amount IS NULL OR p_amount<0 OR p_amount>1000 THEN RAISE EXCEPTION 'Invalid credit'; END IF;
 SELECT reward_points INTO STRICT balance FROM users WHERE id=p_user FOR UPDATE;
 SELECT amount INTO previous FROM reward_sources WHERE user_id=p_user AND source_key=k;
 delta=p_amount-coalesce(previous,0);
 IF balance+delta<0 THEN RAISE EXCEPTION 'Adjustment needs review'; END IF;
 INSERT INTO reward_sources VALUES(p_user,k,p_amount) ON CONFLICT(user_id,source_key) DO UPDATE SET amount=excluded.amount;
 IF delta<>0 THEN INSERT INTO reward_transactions(user_id,source_key,amount) VALUES(p_user,k,delta); END IF;
 INSERT INTO reward_history(user_id,date,health_score,confidence_score,total_rewards_score,confidence_multiplier,points_earned)
 VALUES(p_user,p_date,p_health,p_confidence,p_total,p_multiplier,p_amount)
 ON CONFLICT(user_id,date) DO UPDATE SET health_score=excluded.health_score,confidence_score=excluded.confidence_score,
 total_rewards_score=excluded.total_rewards_score,confidence_multiplier=excluded.confidence_multiplier,points_earned=excluded.points_earned;
 UPDATE users SET reward_points=balance+delta WHERE id=p_user;
 RETURN balance+delta;
END $$;
CREATE FUNCTION public.thrivv_redeem(p_user uuid,p_offer text,p_request uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE balance numeric; cost numeric; redemption reward_redemptions;
BEGIN
 SELECT reward_points INTO STRICT balance FROM users WHERE id=p_user FOR UPDATE;
 SELECT * INTO redemption FROM reward_redemptions WHERE user_id=p_user AND request_id=p_request;
 IF FOUND THEN
 IF redemption.offer_id<>p_offer THEN RAISE EXCEPTION 'Request already used'; END IF;
 RETURN to_jsonb(redemption); END IF;
 SELECT points INTO cost FROM reward_offers WHERE id=p_offer AND active=true FOR SHARE;
 IF cost IS NULL THEN RAISE EXCEPTION 'Offer unavailable'; END IF;
 IF balance<cost THEN RAISE EXCEPTION 'Insufficient points'; END IF;
 INSERT INTO reward_redemptions(user_id,offer_id,request_id,points) VALUES(p_user,p_offer,p_request,cost) RETURNING * INTO redemption;
 INSERT INTO reward_transactions(user_id,source_key,amount) VALUES(p_user,'redeem:'||redemption.id::text,-cost);
 UPDATE users SET reward_points=balance-cost WHERE id=p_user;
 RETURN to_jsonb(redemption);
END $$;
CREATE FUNCTION public.thrivv_accept_invitation(p_user uuid,p_hash text) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE target uuid; current_gym uuid;
BEGIN
 SELECT gym_id INTO target FROM gym_invitations WHERE token_hash=p_hash AND revoked_at IS NULL AND expires_at>now() FOR SHARE;
 IF target IS NULL THEN RAISE EXCEPTION 'Invitation invalid or expired'; END IF;
 SELECT gym_id INTO STRICT current_gym FROM users WHERE id=p_user FOR UPDATE;
 IF current_gym IS NOT NULL AND current_gym<>target THEN RAISE EXCEPTION 'Already belongs to another gym'; END IF;
 UPDATE users SET gym_id=target,membership_start_date=coalesce(membership_start_date,current_date) WHERE id=p_user;
 RETURN target;
END $$;
-- Bulk write keeps ingestion bounded and prevents cross-account ownership changes.
CREATE FUNCTION public.thrivv_store_workouts(p_user uuid,p_records jsonb,p_start timestamptz,p_end timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE w jsonb; target uuid;
BEGIN
 SELECT gym_id INTO STRICT target FROM users WHERE id=p_user FOR UPDATE;
 FOR w IN SELECT value FROM jsonb_array_elements(p_records) LOOP
  IF EXISTS(SELECT 1 FROM whoop_workouts WHERE id=(w->>'id')::uuid AND user_id<>p_user) THEN
   RAISE EXCEPTION 'Workout ownership mismatch';
  END IF;
  INSERT INTO whoop_workouts(id,user_id,gym_id,start_at,end_at,duration_ms,strain,score_state,source_updated_at)
  VALUES((w->>'id')::uuid,p_user,target,(w->>'start_at')::timestamptz,(w->>'end_at')::timestamptz,
   (w->>'duration_ms')::bigint,(w->>'strain')::numeric,w->>'score_state',(w->>'source_updated_at')::timestamptz)
  ON CONFLICT(id) DO UPDATE SET start_at=excluded.start_at,end_at=excluded.end_at,duration_ms=excluded.duration_ms,
   strain=excluded.strain,score_state=excluded.score_state,source_updated_at=excluded.source_updated_at,deleted_at=NULL,updated_at=now()
  WHERE whoop_workouts.user_id=p_user AND whoop_workouts.source_updated_at<=excluded.source_updated_at
   AND NOT(whoop_workouts.score_state='SCORED' AND excluded.score_state<>'SCORED');
 END LOOP;
 UPDATE whoop_workouts SET deleted_at=now() WHERE user_id=p_user AND start_at>=p_start AND start_at<p_end
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_records) AS entry(value) WHERE (entry.value->>'id')::uuid=whoop_workouts.id);
 UPDATE whoop_connections SET last_sync_at=now(),next_sync_at=now()+interval '1 hour' WHERE id=p_user;
END $$;
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT oid::regprocedure AS signature FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname LIKE 'thrivv_%' LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.signature);
 EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
 END LOOP;
END $$;
COMMIT;
