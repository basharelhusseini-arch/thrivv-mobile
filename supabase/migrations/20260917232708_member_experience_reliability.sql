-- All entry points are service-only; route handlers bind p_user to the session.
CREATE FUNCTION public.thrivv_member_activity(p_user uuid,p_today date) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
 WITH days AS (
  SELECT score_date FROM manual_gym_verifications WHERE user_id=p_user AND score_date<=p_today
  UNION SELECT score_date FROM gym_workout_verifications WHERE user_id=p_user AND score_date<=p_today
 ), habits AS (
  SELECT date, (SELECT count(*) FROM jsonb_each(coalesce(habit_details,'{}'::jsonb)) h
   WHERE h.key IN ('sauna','steamRoom','iceBath','coldShower','meditation','stretching') AND h.value='true'::jsonb) n
  FROM daily_checkins WHERE user_id=p_user AND date BETWEEN date_trunc('week',p_today::timestamp)::date AND p_today
 ) SELECT jsonb_build_object('visits',(SELECT count(*) FROM days),
 'weekDays',(SELECT count(*) FROM days WHERE score_date>=date_trunc('week',p_today::timestamp)::date),
 'habitDays',(SELECT count(*) FROM habits WHERE n>0),'todayHabits',coalesce((SELECT n FROM habits WHERE date=p_today),0),
 'weekStart',date_trunc('week',p_today::timestamp)::date);
$$;
REVOKE ALL ON FUNCTION public.thrivv_member_activity(uuid,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.thrivv_member_activity(uuid,date) TO service_role;

CREATE TABLE public.runtime_errors (
 fingerprint text PRIMARY KEY, source text NOT NULL CHECK(source IN ('server','browser')),
 route text NOT NULL, error_type text NOT NULL, occurrences bigint NOT NULL DEFAULT 1,
 first_seen timestamptz NOT NULL DEFAULT now(), last_seen timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.runtime_errors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.runtime_errors FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.runtime_errors TO service_role;
CREATE FUNCTION public.thrivv_record_runtime_error(p_fingerprint text,p_source text,p_route text,p_type text) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$
 INSERT INTO runtime_errors(fingerprint,source,route,error_type) VALUES(left(p_fingerprint,64),p_source,left(p_route,160),left(p_type,80))
 ON CONFLICT(fingerprint) DO UPDATE SET occurrences=runtime_errors.occurrences+1,last_seen=now();
$$;
REVOKE ALL ON FUNCTION public.thrivv_record_runtime_error(text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.thrivv_record_runtime_error(text,text,text,text) TO service_role;
CREATE TABLE public.operation_alert_deliveries (
 fingerprint text PRIMARY KEY, lease_id uuid, lease_until timestamptz, sent_at timestamptz
);
ALTER TABLE public.operation_alert_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operation_alert_deliveries FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.operation_alert_deliveries TO service_role;
CREATE FUNCTION public.thrivv_claim_operation_alert(p_key text,p_lease uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 INSERT INTO operation_alert_deliveries(fingerprint) VALUES(p_key) ON CONFLICT DO NOTHING;
 UPDATE operation_alert_deliveries SET lease_id=p_lease,lease_until=now()+interval '2 minutes'
 WHERE fingerprint=p_key AND (lease_until IS NULL OR lease_until<now()) AND (sent_at IS NULL OR sent_at<now()-interval '6 hours');
 RETURN FOUND;
END $$;
CREATE FUNCTION public.thrivv_finish_operation_alert(p_key text,p_lease uuid,p_sent boolean) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$
 UPDATE operation_alert_deliveries SET lease_id=NULL,lease_until=NULL,sent_at=CASE WHEN p_sent THEN now() ELSE sent_at END
 WHERE fingerprint=p_key AND lease_id=p_lease;
$$;
REVOKE ALL ON FUNCTION public.thrivv_claim_operation_alert(text,uuid),public.thrivv_finish_operation_alert(text,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.thrivv_claim_operation_alert(text,uuid),public.thrivv_finish_operation_alert(text,uuid,boolean) TO service_role;
CREATE FUNCTION public.thrivv_operation_queue(p_offset integer DEFAULT 0,p_limit integer DEFAULT 50) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
 WITH issues AS (
  SELECT 'stock:'||o.id id,CASE WHEN n.remaining=0 THEN 1 ELSE 3 END priority,'stock' kind,
   o.name||': '||n.remaining||' codes remaining' title,'Rewards' tab,o.id target, o.expires_at observed
  FROM reward_offers o CROSS JOIN LATERAL (SELECT count(*) remaining FROM reward_discount_codes c WHERE c.offer_id=o.id AND c.redemption_id IS NULL) n
  WHERE o.active AND o.expires_at>now() AND n.remaining<=o.low_stock_threshold
  UNION ALL
  SELECT 'sync:'||id,2,'sync','WHOOP import paused after '||sync_attempts||' attempts','Members',id::text,coalesce(next_sync_at,now())
  FROM whoop_connections WHERE whoop_access_token IS NOT NULL AND sync_attempts>=6 AND (sync_lease_until IS NULL OR sync_lease_until<now())
  UNION ALL
  SELECT 'redemption:'||id,1,'redemption','Merchant rejected a reward code','Rewards',id::text,created_at FROM reward_redemptions WHERE status='rejected'
  UNION ALL
  SELECT 'support:'||id,3,'support','Open support request','Support',id::text,created_at FROM support_tickets WHERE status='open'
  UNION ALL
  SELECT 'access:'||id,4,'access','Gym access request awaits review','Access requests',id::text,created_at FROM gym_access_requests WHERE status='pending'
  UNION ALL
  SELECT 'error:'||fingerprint,1,'error',source||' error on '||route||' ('||error_type||', '||occurrences||' occurrences)','Overview',fingerprint,last_seen
  FROM runtime_errors WHERE last_seen>now()-interval '24 hours'
 ), page AS (SELECT * FROM issues ORDER BY priority,observed,id LIMIT least(greatest(p_limit,1),100) OFFSET greatest(p_offset,0))
 SELECT jsonb_build_object('total',(SELECT count(*) FROM issues),'issues',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY priority,observed,id) FROM page p),'[]'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.thrivv_operation_queue(integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.thrivv_operation_queue(integer,integer) TO service_role;
