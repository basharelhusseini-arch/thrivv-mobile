-- Additive administration and support. No reward activation or account assignments.
BEGIN;
CREATE TABLE public.gym_access_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), applicant_id uuid NOT NULL REFERENCES public.users(id),
 request_key uuid NOT NULL, gym_name text NOT NULL CHECK(length(gym_name) BETWEEN 1 AND 120),
 location text NOT NULL CHECK(length(location) BETWEEN 1 AND 200), applicant_role text NOT NULL CHECK(length(applicant_role) BETWEEN 1 AND 120),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 gym_id uuid REFERENCES public.gyms(id), reviewed_by uuid REFERENCES public.users(id), review_reason text,
 created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz,
 UNIQUE(applicant_id,request_key)
);
CREATE UNIQUE INDEX gym_request_pending ON public.gym_access_requests(applicant_id,lower(gym_name)) WHERE status='pending';
CREATE INDEX gym_request_created ON public.gym_access_requests(created_at DESC,id);
CREATE TABLE public.admin_audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid NOT NULL REFERENCES public.users(id),
 action text NOT NULL, target_id uuid, request_key uuid NOT NULL, reason text NOT NULL CHECK(length(reason) BETWEEN 3 AND 500),
 before_data jsonb, after_data jsonb, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(actor_id,request_key)
);
CREATE INDEX admin_audit_created ON public.admin_audit_events(created_at DESC,id);
CREATE TABLE public.gym_membership_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id),
 old_gym_id uuid REFERENCES public.gyms(id), new_gym_id uuid REFERENCES public.gyms(id),
 old_start date, new_start date, changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gym_membership_user ON public.gym_membership_history(user_id,changed_at DESC);
CREATE FUNCTION public.thrivv_record_membership() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF OLD.gym_id IS DISTINCT FROM NEW.gym_id OR OLD.membership_start_date IS DISTINCT FROM NEW.membership_start_date THEN
  INSERT INTO gym_membership_history(user_id,old_gym_id,new_gym_id,old_start,new_start) VALUES(NEW.id,OLD.gym_id,NEW.gym_id,OLD.membership_start_date,NEW.membership_start_date);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER thrivv_membership_history AFTER UPDATE OF gym_id,membership_start_date ON public.users FOR EACH ROW EXECUTE FUNCTION public.thrivv_record_membership();
CREATE TABLE public.admin_support_actions (
 id uuid PRIMARY KEY, actor_id uuid NOT NULL REFERENCES public.users(id), user_id uuid NOT NULL REFERENCES public.users(id),
 reason text NOT NULL, status text NOT NULL DEFAULT 'running' CHECK(status IN ('running','succeeded','failed','interrupted')),
 result_code text, created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz
);
CREATE INDEX admin_support_user ON public.admin_support_actions(user_id,created_at DESC);
CREATE TABLE public.support_tickets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id), request_key uuid NOT NULL,
 subject text NOT NULL CHECK(length(subject) BETWEEN 3 AND 120), status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 email_status text NOT NULL DEFAULT 'pending' CHECK(email_status IN ('pending','sending','accepted','failed','unavailable','unknown')),
 email_attempts integer NOT NULL DEFAULT 0, email_attempt_at timestamptz, email_first_attempt_at timestamptz,
 UNIQUE(user_id,request_key)
);
CREATE INDEX support_ticket_created ON public.support_tickets(created_at DESC,id);
CREATE INDEX support_ticket_user ON public.support_tickets(user_id,created_at DESC);
CREATE TABLE public.support_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_id uuid NOT NULL REFERENCES public.support_tickets(id),
 author_id uuid NOT NULL REFERENCES public.users(id), author_role text NOT NULL CHECK(author_role IN ('requester','admin')),
 request_key uuid NOT NULL, body text NOT NULL CHECK(length(body) BETWEEN 1 AND 5000), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(author_id,request_key)
);
CREATE INDEX support_message_ticket ON public.support_messages(ticket_id,created_at,id);

-- One transaction for permissions, edits, audit records and duplicate protection.
CREATE FUNCTION public.thrivv_admin_change(p_actor uuid,p_request uuid,p_action text,p_target uuid,p_reason text,p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE old_data jsonb; new_data jsonb; prior admin_audit_events; target uuid:=p_target; applicant uuid; g uuid; current_status text; u uuid;
BEGIN
 PERFORM 1 FROM users WHERE id=p_actor AND is_admin=true FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Admin required'; END IF;
 IF p_request IS NULL OR length(trim(coalesce(p_reason,''))) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'Reason and request required'; END IF;
 SELECT * INTO prior FROM admin_audit_events WHERE actor_id=p_actor AND request_key=p_request;
 IF FOUND THEN
  IF prior.action<>p_action OR (p_target IS NOT NULL AND prior.target_id IS DISTINCT FROM p_target) THEN RAISE EXCEPTION 'Request already used'; END IF;
  RETURN prior.after_data;
 END IF;
 IF p_action IN ('gym.create','gym.edit') THEN
  IF length(trim(coalesce(p_data->>'name',''))) NOT BETWEEN 1 AND 120 OR length(coalesce(p_data->>'owner_email',''))>254 OR coalesce(p_data->>'owner_email','') NOT LIKE '%_@_%._%' THEN RAISE EXCEPTION 'Invalid gym'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=coalesce(p_data->>'timezone','UTC')) THEN RAISE EXCEPTION 'Invalid timezone'; END IF;
  IF coalesce((p_data->>'pilot_member_count')::integer,0)<0 THEN RAISE EXCEPTION 'Invalid cohort'; END IF;
  IF p_action='gym.create' THEN
   INSERT INTO gyms(name,owner_email,timezone,pilot_start_date,pilot_member_count) VALUES(trim(p_data->>'name'),lower(trim(p_data->>'owner_email')),coalesce(p_data->>'timezone','UTC'),nullif(p_data->>'pilot_start_date','')::date,coalesce((p_data->>'pilot_member_count')::integer,0)) RETURNING id INTO target;
  ELSE
   SELECT jsonb_build_object('name',name,'owner_email',owner_email,'timezone',timezone,'pilot_start_date',pilot_start_date,'pilot_member_count',pilot_member_count) INTO old_data FROM gyms WHERE id=target FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Gym unavailable'; END IF;
   UPDATE gyms SET name=trim(p_data->>'name'),owner_email=lower(trim(p_data->>'owner_email')),timezone=coalesce(p_data->>'timezone','UTC'),pilot_start_date=nullif(p_data->>'pilot_start_date','')::date,pilot_member_count=coalesce((p_data->>'pilot_member_count')::integer,0) WHERE id=target;
  END IF;
  SELECT jsonb_build_object('id',id,'name',name,'owner_email',owner_email,'timezone',timezone,'pilot_start_date',pilot_start_date,'pilot_member_count',pilot_member_count) INTO new_data FROM gyms WHERE id=target;
 ELSIF p_action='member.assign' THEN
  g:=nullif(p_data->>'gym_id','')::uuid;
  IF g IS NOT NULL THEN PERFORM 1 FROM gyms WHERE id=g FOR SHARE; IF NOT FOUND THEN RAISE EXCEPTION 'Gym unavailable'; END IF; END IF;
  SELECT jsonb_build_object('gym_id',gym_id,'membership_start_date',membership_start_date) INTO old_data FROM users WHERE id=target FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Member unavailable'; END IF;
  IF g IS NOT NULL AND nullif(p_data->>'membership_start_date','') IS NULL THEN RAISE EXCEPTION 'Membership date required'; END IF;
  IF nullif(p_data->>'membership_start_date','')::date > current_date THEN RAISE EXCEPTION 'Future membership date'; END IF;
  UPDATE users SET gym_id=g,membership_start_date=CASE WHEN g IS NULL THEN NULL ELSE (p_data->>'membership_start_date')::date END WHERE id=target;
  SELECT jsonb_build_object('id',id,'gym_id',gym_id,'membership_start_date',membership_start_date) INTO new_data FROM users WHERE id=target;
 ELSIF p_action='support.notify' THEN
  SELECT jsonb_build_object('email_status',email_status) INTO old_data FROM support_tickets WHERE id=target FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket unavailable'; END IF;
  new_data:=jsonb_build_object('notification_requested',true);
 ELSIF p_action IN ('operator.grant','operator.revoke') THEN
  u:=(p_data->>'user_id')::uuid;
  SELECT jsonb_build_object('assigned',exists(SELECT 1 FROM gym_operators WHERE gym_id=target AND user_id=u)) INTO old_data;
  PERFORM thrivv_set_gym_operator(p_actor,target,u,p_action='operator.grant');
  new_data:=jsonb_build_object('gym_id',target,'user_id',u,'assigned',p_action='operator.grant');
 ELSIF p_action IN ('request.approve','request.reject') THEN
  SELECT applicant_id,status INTO applicant,current_status FROM gym_access_requests WHERE id=target FOR UPDATE;
  IF NOT FOUND OR current_status<>'pending' THEN RAISE EXCEPTION 'Request no longer pending'; END IF;
  g:=nullif(p_data->>'gym_id','')::uuid;
  IF p_action='request.approve' THEN
   IF g IS NULL THEN RAISE EXCEPTION 'Select a gym'; END IF;
   PERFORM thrivv_set_gym_operator(p_actor,g,applicant,true);
  ELSE g:=NULL; END IF;
  old_data:=jsonb_build_object('status','pending');
  UPDATE gym_access_requests SET status=CASE WHEN p_action='request.approve' THEN 'approved' ELSE 'rejected' END,gym_id=g,reviewed_by=p_actor,review_reason=p_reason,reviewed_at=now() WHERE id=target;
  new_data:=jsonb_build_object('id',target,'gym_id',g,'status',CASE WHEN p_action='request.approve' THEN 'approved' ELSE 'rejected' END);
 ELSE RAISE EXCEPTION 'Unsupported action'; END IF;
 INSERT INTO admin_audit_events(actor_id,request_key,action,target_id,reason,before_data,after_data) VALUES(p_actor,p_request,p_action,target,p_reason,old_data,new_data);
 RETURN new_data;
END $$;

CREATE FUNCTION public.thrivv_request_gym(p_user uuid,p_request uuid,p_name text,p_location text,p_role text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE result uuid;
BEGIN
 PERFORM 1 FROM users WHERE id=p_user FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Account unavailable'; END IF;
 SELECT id INTO result FROM gym_access_requests WHERE applicant_id=p_user AND request_key=p_request; IF FOUND THEN RETURN result; END IF;
 IF (SELECT count(*) FROM gym_access_requests WHERE applicant_id=p_user AND created_at>now()-interval '1 day')>=5 THEN RAISE EXCEPTION 'Request limit reached'; END IF;
 INSERT INTO gym_access_requests(applicant_id,request_key,gym_name,location,applicant_role) VALUES(p_user,p_request,trim(p_name),trim(p_location),trim(p_role)) RETURNING id INTO result;
 RETURN result;
END $$;

CREATE FUNCTION public.thrivv_support_message(p_actor uuid,p_request uuid,p_ticket uuid,p_subject text,p_body text,p_status text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE t uuid:=p_ticket; owner_id uuid; admin boolean; existing support_messages; previous_status text;
BEGIN
 SELECT is_admin INTO admin FROM users WHERE id=p_actor FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Account unavailable'; END IF;
 IF p_request IS NULL THEN RAISE EXCEPTION 'Request required'; END IF;
 IF p_status IS NOT NULL AND NOT coalesce(admin,false) THEN RAISE EXCEPTION 'Admin required'; END IF;
 IF t IS NULL THEN
  SELECT id INTO t FROM support_tickets WHERE user_id=p_actor AND request_key=p_request; IF FOUND THEN RETURN t; END IF;
  IF (SELECT count(*) FROM support_tickets WHERE user_id=p_actor AND created_at>now()-interval '1 day')>=5 THEN RAISE EXCEPTION 'Ticket limit reached'; END IF;
  INSERT INTO support_tickets(user_id,request_key,subject) VALUES(p_actor,p_request,trim(p_subject)) RETURNING id INTO t;
  owner_id:=p_actor;
 ELSE
  SELECT user_id,status INTO owner_id,previous_status FROM support_tickets WHERE id=t FOR UPDATE;
  IF NOT FOUND OR (owner_id<>p_actor AND NOT coalesce(admin,false)) THEN RAISE EXCEPTION 'Ticket unavailable'; END IF;
  SELECT * INTO existing FROM support_messages WHERE author_id=p_actor AND request_key=p_request;
  IF FOUND THEN IF existing.ticket_id<>t THEN RAISE EXCEPTION 'Request already used'; END IF; RETURN t; END IF;
 END IF;
 IF (SELECT count(*) FROM support_messages WHERE author_id=p_actor AND created_at>now()-interval '1 hour')>=30 THEN RAISE EXCEPTION 'Message limit reached'; END IF;
 IF p_status IS NOT NULL AND p_status NOT IN ('open','resolved') THEN RAISE EXCEPTION 'Invalid status'; END IF;
 INSERT INTO support_messages(ticket_id,author_id,author_role,request_key,body) VALUES(t,p_actor,CASE WHEN admin AND owner_id<>p_actor THEN 'admin' ELSE 'requester' END,p_request,trim(p_body));
 UPDATE support_tickets SET updated_at=now(),status=coalesce(p_status,'open') WHERE id=t;
 IF admin THEN
  INSERT INTO admin_audit_events(actor_id,request_key,action,target_id,reason,before_data,after_data)
  VALUES(p_actor,p_request,'support.reply',t,'Support reply',jsonb_build_object('status',previous_status),jsonb_build_object('status',coalesce(p_status,'open')));
 END IF;
 RETURN t;
END $$;

CREATE FUNCTION public.thrivv_admin_sync_start(p_actor uuid,p_request uuid,p_user uuid,p_reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM 1 FROM users WHERE id=p_actor AND is_admin=true FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Admin required'; END IF;
 IF length(trim(coalesce(p_reason,''))) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'Reason required'; END IF;
 PERFORM 1 FROM users WHERE id=p_user FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Member unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM admin_support_actions WHERE id=p_request) THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM admin_support_actions WHERE user_id=p_user AND created_at>now()-interval '5 minutes') THEN RAISE EXCEPTION 'Retry cooldown'; END IF;
 UPDATE admin_support_actions SET status='interrupted',result_code='outcome_unknown',finished_at=now() WHERE user_id=p_user AND status='running';
 INSERT INTO admin_support_actions(id,actor_id,user_id,reason) VALUES(p_request,p_actor,p_user,p_reason);
 INSERT INTO admin_audit_events(actor_id,request_key,action,target_id,reason,after_data) VALUES(p_actor,p_request,'sync.request',p_user,p_reason,jsonb_build_object('action_id',p_request));
 RETURN true;
END $$;

DO $$ DECLARE t text; f record; BEGIN
 FOREACH t IN ARRAY ARRAY['gym_access_requests','admin_audit_events','gym_membership_history','admin_support_actions','support_tickets','support_messages'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated,service_role',t);
  EXECUTE format('GRANT SELECT,INSERT ON public.%I TO service_role',t);
 END LOOP;
 GRANT UPDATE ON public.gym_access_requests,public.admin_support_actions,public.support_tickets TO service_role;
 FOR f IN SELECT p.oid::regprocedure AS name FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('thrivv_admin_change','thrivv_request_gym','thrivv_support_message','thrivv_admin_sync_start','thrivv_record_membership') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.name);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.name);
 END LOOP;
END $$;

CREATE FUNCTION public.thrivv_admin_overview(p_actor uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM users WHERE id=p_actor AND is_admin=true) THEN RAISE EXCEPTION 'Admin required'; END IF;
 RETURN jsonb_build_object(
 'gyms',(SELECT count(*) FROM gyms), 'members',(SELECT count(*) FROM users),
 'gym_members',(SELECT count(*) FROM users WHERE gym_id IS NOT NULL),
 'active_members',(SELECT count(DISTINCT c.user_id) FROM daily_checkins c JOIN users u ON u.id=c.user_id WHERE u.gym_id IS NOT NULL AND u.membership_start_date IS NOT NULL AND c.date>=u.membership_start_date AND c.date BETWEEN (now() AT TIME ZONE 'UTC')::date-6 AND (now() AT TIME ZONE 'UTC')::date),
 'connected',(SELECT count(*) FROM whoop_connections WHERE whoop_connected_at IS NOT NULL),
 'stale_syncs',(SELECT count(*) FROM whoop_connections WHERE whoop_connected_at IS NOT NULL AND (last_sync_at IS NULL OR last_sync_at<now()-interval '24 hours')),
 'failed_support_syncs',(SELECT count(*) FROM admin_support_actions WHERE status='failed' AND created_at>now()-interval '7 days'),
 'pending_requests',(SELECT count(*) FROM gym_access_requests WHERE status='pending'),
 'open_tickets',(SELECT count(*) FROM support_tickets WHERE status='open'));
END $$;
REVOKE ALL ON FUNCTION public.thrivv_admin_overview(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.thrivv_admin_overview(uuid) TO service_role;
CREATE FUNCTION public.thrivv_admin_gyms(p_actor uuid,p_offset integer) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM users WHERE id=p_actor AND is_admin=true) THEN RAISE EXCEPTION 'Admin required'; END IF;
 IF p_offset<0 OR p_offset>1000000 THEN RAISE EXCEPTION 'Invalid page'; END IF;
 SELECT coalesce(jsonb_agg(row_to_json(g)), '[]'::jsonb) INTO result FROM
 (SELECT g.id,g.name,g.owner_email,g.timezone,g.pilot_start_date,g.pilot_member_count,g.created_at,(SELECT count(*) FROM users u WHERE u.gym_id=g.id) AS member_count FROM gyms g ORDER BY g.created_at DESC,g.id LIMIT 50 OFFSET p_offset) g;
 RETURN jsonb_build_object('gyms',result,'total',(SELECT count(*) FROM gyms),'offset',p_offset);
END $$;
REVOKE ALL ON FUNCTION public.thrivv_admin_gyms(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.thrivv_admin_gyms(uuid,integer) TO service_role;

NOTIFY pgrst,'reload schema';
COMMIT;
