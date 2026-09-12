-- Additive weekly reader. Daily scores and redeemable rewards are never modified.
-- Apply before deploying the API that calls this function. Keep the daily RPC for rollback.
BEGIN;
CREATE FUNCTION public.thrivv_weekly_health_leaderboard(p_user uuid) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp AS $$
 WITH context AS (
  SELECT u.gym_id,g.timezone,(now() AT TIME ZONE g.timezone)::date AS day,
   date_trunc('week',now() AT TIME ZONE g.timezone)::date AS week_start,c.effective_date
  FROM users u JOIN gyms g ON g.id=u.gym_id CROSS JOIN health_scoring_config c
  WHERE u.id=p_user AND c.version='health-v3'
 ), members AS (
  SELECT u.id,coalesce(nullif(trim(u.first_name||' '||u.last_name),''),'Member') AS name,
   coalesce(sum(s.score),0) AS score,coalesce(sum(s.training_score),0) AS training_score,
   coalesce(sum(s.recovery_score),0) AS recovery_score,coalesce(sum(s.habit_score),0) AS habit_score,
   count(s.date) AS scored_days
  FROM context c JOIN users u ON u.gym_id=c.gym_id
  LEFT JOIN health_score_days s ON s.user_id=u.id AND s.gym_id=c.gym_id
   AND s.date>=c.week_start AND s.date<=c.day AND s.date<c.week_start+7
   AND s.version='health-v3' AND s.timezone=c.timezone AND s.date>=c.effective_date
   AND (u.membership_start_date IS NULL OR s.date>=u.membership_start_date)
   AND s.complete AND s.score IS NOT NULL
  WHERE u.membership_start_date IS NULL OR u.membership_start_date<=c.day
  GROUP BY u.id,u.first_name,u.last_name
 ), ranked AS (
  SELECT *,rank() OVER(ORDER BY score DESC) AS rank,row_number() OVER(ORDER BY score DESC,id) AS position
  FROM members WHERE scored_days>0
 ), visible AS (SELECT * FROM ranked WHERE position<=10 OR id=p_user),
 pending AS (SELECT id,name,NULL::bigint AS rank FROM members WHERE scored_days=0 ORDER BY id LIMIT 10)
 SELECT jsonb_build_object('hasGym',EXISTS(SELECT 1 FROM context),'period','week','maxScore',770,
  'weekStart',(SELECT week_start FROM context),'weekEnd',(SELECT week_start+6 FROM context),
  'date',(SELECT day FROM context),'timezone',(SELECT timezone FROM context),
  'leaderboard',coalesce((SELECT jsonb_agg(to_jsonb(v)-'position' ORDER BY position) FROM visible v),'[]'::jsonb),
  'pending',coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM pending p),'[]'::jsonb),
  'pendingCount',(SELECT count(*) FROM members WHERE scored_days=0),
  'rankedCount',(SELECT count(*) FROM ranked),
  'currentRank',(SELECT rank FROM ranked WHERE id=p_user));
$$;
REVOKE ALL ON FUNCTION public.thrivv_weekly_health_leaderboard(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.thrivv_weekly_health_leaderboard(uuid) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
