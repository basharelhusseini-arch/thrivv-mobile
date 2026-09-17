BEGIN;
-- Enforce future profile writes without rewriting or deleting historical orphan rows.
-- A login/signup request in flight cannot recreate a profile after Auth deletion.
ALTER TABLE public.users ADD CONSTRAINT users_auth_identity
 FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
-- Preserve other members' verification history and gym access after staff deletion.
ALTER TABLE public.gym_operators ALTER COLUMN assigned_by DROP NOT NULL;
ALTER TABLE public.gym_invitations ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.gym_join_codes ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.gym_workout_verifications ALTER COLUMN operator_id DROP NOT NULL;
ALTER TABLE public.manual_gym_verifications ALTER COLUMN operator_id DROP NOT NULL;
ALTER TABLE public.support_messages ALTER COLUMN author_id DROP NOT NULL;

-- Runs inside GoTrue's hard-delete transaction: a cleanup error rolls everything back.
-- This must be a definer because Auth's database role cannot delete public app data.
CREATE FUNCTION public.thrivv_cleanup_deleted_account() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE email_address text;
BEGIN
 SELECT email INTO email_address FROM public.users WHERE id=OLD.id FOR UPDATE;
 DELETE FROM public.support_messages WHERE ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id=OLD.id);
 DELETE FROM public.support_tickets WHERE user_id=OLD.id;
 -- Retain a neutral placeholder for staff replies on other members' tickets.
 UPDATE public.support_messages SET author_id=NULL, body='[Deleted account]' WHERE author_id=OLD.id;
 DELETE FROM public.admin_support_actions WHERE user_id=OLD.id OR actor_id=OLD.id;
 DELETE FROM public.admin_audit_events WHERE actor_id=OLD.id OR target_id=OLD.id
   OR before_data::text LIKE '%'||OLD.id::text||'%' OR after_data::text LIKE '%'||OLD.id::text||'%'
   OR (email_address IS NOT NULL AND (strpos(lower(before_data::text),lower(email_address))>0 OR strpos(lower(after_data::text),lower(email_address))>0));
 DELETE FROM public.gym_access_requests WHERE applicant_id=OLD.id;
 UPDATE public.gym_access_requests SET reviewed_by=NULL WHERE reviewed_by=OLD.id;
 UPDATE public.gym_operators SET assigned_by=NULL WHERE assigned_by=OLD.id;
 UPDATE public.gym_invitations SET created_by=NULL WHERE created_by=OLD.id;
 UPDATE public.gym_join_codes SET created_by=NULL WHERE created_by=OLD.id;
 UPDATE public.gym_workout_verifications SET operator_id=NULL WHERE operator_id=OLD.id;
 UPDATE public.manual_gym_verifications SET operator_id=NULL WHERE operator_id=OLD.id;
 DELETE FROM public.gym_workout_verifications WHERE user_id=OLD.id;
 DELETE FROM public.manual_gym_verifications WHERE user_id=OLD.id;
 DELETE FROM public.gym_join_attempts WHERE user_id=OLD.id;
 DELETE FROM public.gym_membership_history WHERE user_id=OLD.id;
 -- Delete consumed inventory instead of resetting redemption_id (which would reissue codes).
 DELETE FROM public.reward_discount_codes WHERE redemption_id IN (SELECT id FROM public.reward_redemptions WHERE user_id=OLD.id);
 DELETE FROM public.reward_redemptions WHERE user_id=OLD.id;
 DELETE FROM public.reward_transactions WHERE user_id=OLD.id;
 DELETE FROM public.daily_reward_entitlements WHERE user_id=OLD.id;
 DELETE FROM public.health_score_days WHERE user_id=OLD.id;
 DELETE FROM public.whoop_workouts WHERE user_id=OLD.id;
 DELETE FROM public.whoop_sync_locks WHERE user_id=OLD.id;
 DELETE FROM public.whoop_connections WHERE id=OLD.id;
 DELETE FROM public.workouts WHERE member_id=OLD.id::text;
 DELETE FROM public.workout_plans WHERE member_id=OLD.id::text;
 DELETE FROM public.nutrition_plans WHERE member_id=OLD.id::text;
 UPDATE public.workouts SET user_id=NULL WHERE user_id=OLD.id;
 UPDATE public.workout_plans SET user_id=NULL WHERE user_id=OLD.id;
 UPDATE public.users SET user_id=NULL WHERE user_id=OLD.id AND id<>OLD.id;
 UPDATE public.workout_plans SET created_by=NULL WHERE created_by=OLD.id::text;
 UPDATE public.nutrition_plans SET created_by=NULL WHERE created_by=OLD.id::text;
 DELETE FROM public.risk_events WHERE user_id=OLD.id;
 DELETE FROM public.risk_user_features WHERE user_id=OLD.id;
 DELETE FROM public.device_registry WHERE user_id=OLD.id;
 -- A gym belongs to its business; remove the deleted member's contact address only.
 UPDATE public.gyms SET owner_email='' WHERE lower(owner_email)=lower(email_address);
 DELETE FROM public.users WHERE id=OLD.id;
 -- Remaining public/auth records have ON DELETE CASCADE (habits, scores, nutrition,
 -- recipes, health profile, check-ins, wearable leads, identities and sessions).
 RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.thrivv_cleanup_deleted_account() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER thrivv_before_auth_account_delete BEFORE DELETE ON auth.users
 FOR EACH ROW EXECUTE FUNCTION public.thrivv_cleanup_deleted_account();

-- Historical text ownership columns have no FK. Serialize new writes against deletion
-- and reject writes from a request that authenticated before its account was removed.
CREATE FUNCTION public.thrivv_check_record_owner() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner_id text;
BEGIN
 owner_id := to_jsonb(NEW)->>TG_ARGV[0];
 PERFORM 1 FROM public.users WHERE id::text=owner_id FOR KEY SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Account unavailable' USING ERRCODE='23503'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.thrivv_check_record_owner() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER thrivv_workout_owner BEFORE INSERT OR UPDATE OF member_id ON public.workouts FOR EACH ROW EXECUTE FUNCTION public.thrivv_check_record_owner('member_id');
CREATE TRIGGER thrivv_plan_owner BEFORE INSERT OR UPDATE OF member_id ON public.workout_plans FOR EACH ROW EXECUTE FUNCTION public.thrivv_check_record_owner('member_id');
CREATE TRIGGER thrivv_nutrition_owner BEFORE INSERT OR UPDATE OF member_id ON public.nutrition_plans FOR EACH ROW EXECUTE FUNCTION public.thrivv_check_record_owner('member_id');
CREATE TRIGGER thrivv_device_owner BEFORE INSERT OR UPDATE OF user_id ON public.device_registry FOR EACH ROW EXECUTE FUNCTION public.thrivv_check_record_owner('user_id');
CREATE TRIGGER thrivv_risk_owner BEFORE INSERT OR UPDATE OF user_id ON public.risk_events FOR EACH ROW EXECUTE FUNCTION public.thrivv_check_record_owner('user_id');
CREATE TRIGGER thrivv_features_owner BEFORE INSERT OR UPDATE OF user_id ON public.risk_user_features FOR EACH ROW EXECUTE FUNCTION public.thrivv_check_record_owner('user_id');

-- Fail closed if the cleanup trigger is missing or disabled. Check before calling Auth.
CREATE FUNCTION public.thrivv_account_deletion_ready() RETURNS boolean
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM pg_catalog.pg_trigger t
   JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
   JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='auth' AND c.relname='users'
   AND t.tgname='thrivv_before_auth_account_delete' AND t.tgenabled IN ('O','A'));
$$;
REVOKE ALL ON FUNCTION public.thrivv_account_deletion_ready() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.thrivv_account_deletion_ready() TO service_role;
COMMIT;
