-- Additive gym portal access; no rewards, QR verification, or activation changes.
BEGIN;
CREATE TABLE public.gym_operators (
 gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
 assigned_by uuid NOT NULL REFERENCES public.users(id),
 assigned_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(gym_id,user_id)
);
CREATE INDEX gym_operators_user_idx ON public.gym_operators(user_id);
ALTER TABLE public.gym_operators ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gym_operators FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.gym_operators TO service_role;
-- No email-based backfill: a platform administrator explicitly assigns account IDs.
ALTER TABLE public.gym_join_codes ADD COLUMN code_ciphertext text;
ALTER TABLE public.gym_join_codes ADD COLUMN code_encryption_version smallint;
ALTER TABLE public.gym_join_codes ADD CONSTRAINT gym_code_envelope CHECK (
 (code_ciphertext IS NULL AND code_encryption_version IS NULL) OR
 (code_ciphertext IS NOT NULL AND code_encryption_version IS NOT NULL AND code_encryption_version=1)
);
ALTER TABLE public.gym_join_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gym_join_codes FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.gym_join_codes TO service_role;
-- Existing hashes and membership validation remain intact. No automatic regeneration.
CREATE FUNCTION public.thrivv_set_gym_operator(p_actor uuid,p_gym uuid,p_user uuid,p_grant boolean)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM 1 FROM users WHERE id=p_actor AND is_admin=true FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Admin required'; END IF;
 IF p_grant IS NULL THEN RAISE EXCEPTION 'Action required'; END IF;
 PERFORM 1 FROM gyms WHERE id=p_gym FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Gym unavailable'; END IF;
 PERFORM 1 FROM users WHERE id=p_user FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Account unavailable'; END IF;
 IF p_grant THEN
  INSERT INTO gym_operators(gym_id,user_id,assigned_by) VALUES(p_gym,p_user,p_actor)
  ON CONFLICT(gym_id,user_id) DO NOTHING;
 ELSE
  DELETE FROM gym_operators WHERE gym_id=p_gym AND user_id=p_user;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.thrivv_set_gym_operator(uuid,uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.thrivv_set_gym_operator(uuid,uuid,uuid,boolean) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
