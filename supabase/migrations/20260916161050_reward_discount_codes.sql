BEGIN;
-- No partner offers or fabricated merchant codes are seeded.
ALTER TABLE public.reward_offers
 ADD COLUMN partner_name text NOT NULL DEFAULT '',
 ADD COLUMN category text CHECK(category IN ('restaurant','supplement','gym_class')),
 ADD COLUMN discount_percent integer CHECK(discount_percent BETWEEN 1 AND 100),
 ADD COLUMN terms text NOT NULL DEFAULT '',
 ADD COLUMN instructions text NOT NULL DEFAULT '',
 ADD COLUMN website_url text,
 ADD COLUMN expires_at timestamptz;
ALTER TABLE public.reward_redemptions
 ADD COLUMN discount_code text,
 ADD COLUMN expires_at timestamptz,
 ADD COLUMN offer_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE public.reward_discount_codes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 offer_id text NOT NULL REFERENCES public.reward_offers(id),
 code text NOT NULL CHECK(code ~ '^[A-Za-z0-9_-]{3,100}$'),
 redemption_id uuid UNIQUE REFERENCES public.reward_redemptions(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(offer_id,code)
);
CREATE INDEX reward_codes_available ON public.reward_discount_codes(offer_id,created_at,id) WHERE redemption_id IS NULL;
ALTER TABLE public.reward_discount_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reward_discount_codes FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.reward_discount_codes TO service_role;
-- Existing tables also remain server-only: the app uses custom authenticated sessions.
REVOKE ALL ON public.reward_offers,public.reward_redemptions FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.reward_offers,public.reward_redemptions TO service_role;
GRANT INSERT ON public.reward_transactions TO service_role;

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
 SELECT * INTO c FROM reward_discount_codes WHERE offer_id=p_offer AND redemption_id IS NULL ORDER BY created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED;
 IF NOT FOUND THEN RAISE EXCEPTION 'No codes available'; END IF;
 INSERT INTO reward_redemptions(user_id,offer_id,request_id,points,status,discount_code,expires_at,offer_snapshot)
 VALUES(p_user,p_offer,p_request,o.points,'issued',c.code,o.expires_at,to_jsonb(o)-'active') RETURNING * INTO r;
 UPDATE reward_discount_codes SET redemption_id=r.id WHERE id=c.id;
 INSERT INTO reward_transactions(user_id,kind,amount) VALUES(p_user,'redemption',-o.points);
 UPDATE users SET reward_points=coalesce(reward_points,0)-o.points WHERE id=p_user;
 RETURN to_jsonb(r);
END $$;

CREATE FUNCTION public.thrivv_reward_catalog(p_actor uuid,p_admin boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM users WHERE id=p_actor) THEN RAISE EXCEPTION 'Account unavailable'; END IF;
 IF p_admin AND NOT EXISTS(SELECT 1 FROM users WHERE id=p_actor AND is_admin=true) THEN RAISE EXCEPTION 'Admin required'; END IF;
 -- Code values never appear in the catalog, including the admin overview.
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(o) || jsonb_build_object('available',o.active AND o.expires_at>now() AND n.remaining>0)
   || CASE WHEN p_admin THEN jsonb_build_object('remaining',n.remaining) ELSE '{}'::jsonb END ORDER BY o.name)
 FROM reward_offers o CROSS JOIN LATERAL (SELECT count(*) AS remaining FROM reward_discount_codes c WHERE c.offer_id=o.id AND c.redemption_id IS NULL) n
 WHERE p_admin OR (o.active AND o.expires_at>now())), '[]'::jsonb);
END $$;

CREATE FUNCTION public.thrivv_manage_reward(p_actor uuid,p_request uuid,p_action text,p_offer text,p_reason text,p_data jsonb)
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
  INSERT INTO reward_offers(id,name,points,active,partner_name,category,discount_percent,terms,instructions,website_url,expires_at)
  VALUES(p_offer,p_data->>'name',points_cost,false,p_data->>'partner_name',category_name,pct,p_data->>'terms',p_data->>'instructions',p_data->>'website_url',(p_data->>'expires_at')::timestamptz) RETURNING * INTO o;
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
REVOKE ALL ON FUNCTION public.thrivv_redeem(uuid,text,uuid),public.thrivv_reward_catalog(uuid,boolean),public.thrivv_manage_reward(uuid,uuid,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.thrivv_redeem(uuid,text,uuid),public.thrivv_reward_catalog(uuid,boolean),public.thrivv_manage_reward(uuid,uuid,text,text,text,jsonb) TO service_role;
COMMIT;
