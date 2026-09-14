-- These records are accessed only by signed-in server routes and the secret-protected job.
-- Preserve all records and existing server grants; remove direct client access.
alter table public.risk_events enable row level security;
alter table public.device_registry enable row level security;
revoke all on public.risk_events, public.device_registry from public, anon, authenticated;
