-- Approval required before production deployment. Store token hashes, never tokens.
CREATE TABLE public.revoked_app_sessions (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  revoked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.revoked_app_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.revoked_app_sessions FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.revoked_app_sessions TO service_role;
